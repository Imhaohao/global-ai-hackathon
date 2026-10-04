import { checkHubToken, CONVERSATION_REPLIES_PER_WINDOW, DEFAULT_BACKEND_URL, evaluateReply } from "../../shared/src/index.ts";
import { claimQueuedAlerts, leaveAreaAlerts, reportAlertDelivery, type QueuedAlert } from "./alertOutbox.ts";
import { askLeafDoctor, askLeafDoctorAboutPhoto } from "./askLeafDoctor.ts";
import { mergeCaptions } from "./mergeCaptions.ts";
import { preparePhoto } from "./preparePhoto.ts";
import { MESSAGES_DB_PATH, MessagesDb, type IncomingMessage, type MessageAttachment } from "./messagesDb.ts";
import { sendWithMessagesApp } from "./sendMessage.ts";
import { decideIncoming, decidePhoto, isInSession, isPendingPhotoFresh, KEYWORD, REPLY_PREFIX } from "./sessionRules.ts";

const POLL_MS = 3000;
const ALERT_POLL_MS = 30_000;
const FIRST_REPLY_FOOTER = "\n(Automated coffee leaf advice. Text STOP to end.)";
const WELCOME_REPLY = `${REPLY_PREFIX}Hi! Tell me what you see on your coffee leaves: the colour of the spots, top or underneath, and any powder, rings or tunnels.${FIRST_REPLY_FOOTER}`;
const GOODBYE_REPLY = `${REPLY_PREFIX}Okay, I'll stop. Text ${KEYWORD} with your question any time.`;

const dryRun = process.argv.includes("--dry-run");
let token = process.env.LEAF_BRIDGE_TOKEN?.trim() || undefined;
const lastActiveBySender = new Map<string, number>();
const replyTimesBySender = new Map<string, number[]>();
const pendingPhotoBySender = new Map<string, { attachment: MessageAttachment; heldAt: number }>();

function mask(handle: string): string {
  return handle.includes("@") ? `${handle.slice(0, 2)}...@${handle.split("@")[1]}` : `...${handle.slice(-4)}`;
}

function claimReplySlot(sender: string, now: number): boolean {
  const decision = evaluateReply(replyTimesBySender.get(sender) ?? [], now, CONVERSATION_REPLIES_PER_WINDOW);
  replyTimesBySender.set(sender, decision.recentReplyTimes);
  return decision.allowed;
}

async function deliver(message: IncomingMessage, text: string): Promise<void> {
  if (dryRun) {
    console.log(`[dry run] would reply to ${mask(message.sender)} over ${message.service}:\n${text}\n`);
    return;
  }
  await sendWithMessagesApp(message.sender, message.service, text);
  console.log(`Replied to ${mask(message.sender)} over ${message.service}`);
}

function withPrefix(reply: string, isNewSession: boolean): string {
  return `${REPLY_PREFIX}${reply}${isNewSession ? FIRST_REPLY_FOOTER : ""}`;
}

async function photoReplyFor(message: IncomingMessage, attachment: MessageAttachment, caption: string): Promise<string> {
  const photo = await preparePhoto(attachment.path);
  const { reply, source } = await askLeafDoctorAboutPhoto(message.sender, caption, photo, token);
  console.log(`Answered photo from ${mask(message.sender)} (${source})`);
  return reply;
}

function takePendingPhoto(sender: string, now: number): MessageAttachment | null {
  const pending = pendingPhotoBySender.get(sender);
  pendingPhotoBySender.delete(sender);
  return pending && isPendingPhotoFresh(pending.heldAt, now) ? pending.attachment : null;
}

async function startOrContinue(message: IncomingMessage, now: number, answer: () => Promise<string>): Promise<void> {
  const isNewSession = !isInSession(lastActiveBySender.get(message.sender), now);
  lastActiveBySender.set(message.sender, now);
  await deliver(message, withPrefix(await answer(), isNewSession));
}

async function handlePhoto(message: IncomingMessage, attachment: MessageAttachment, now: number): Promise<void> {
  const decision = decidePhoto(message.text ?? "", lastActiveBySender.get(message.sender), now);
  if (decision.kind === "hold") {
    pendingPhotoBySender.set(message.sender, { attachment, heldAt: now });
    return;
  }
  if (!claimReplySlot(message.sender, now)) return;
  await startOrContinue(message, now, () => photoReplyFor(message, attachment, decision.caption));
}

async function handleText(message: IncomingMessage, text: string, now: number): Promise<void> {
  const decision = decideIncoming(text, lastActiveBySender.get(message.sender), now);
  if (decision.kind === "ignore" || !claimReplySlot(message.sender, now)) return;
  if (decision.kind === "end") {
    lastActiveBySender.delete(message.sender);
    pendingPhotoBySender.delete(message.sender);
    await deliver(message, GOODBYE_REPLY);
    if (token && !dryRun) await leaveAreaAlerts(token, message.sender);
    return;
  }
  const pendingPhoto = takePendingPhoto(message.sender, now);
  if (pendingPhoto) {
    const caption = decision.kind === "answer" ? decision.question : "";
    await startOrContinue(message, now, () => photoReplyFor(message, pendingPhoto, caption));
    return;
  }
  if (decision.kind === "welcome") {
    lastActiveBySender.set(message.sender, now);
    await deliver(message, WELCOME_REPLY);
    return;
  }
  await startOrContinue(message, now, async () => {
    const { reply, source } = await askLeafDoctor(message.sender, decision.question, token);
    console.log(`Answered ${mask(message.sender)} (${source})`);
    return reply;
  });
}

async function handle(message: IncomingMessage): Promise<void> {
  if (message.isGroupChat) return;
  const now = Date.now();
  const [photo] = message.attachments;
  if (photo) return handlePhoto(message, photo, now);
  if (message.text) return handleText(message, message.text, now);
}

function serviceFor(db: MessagesDb, handle: string): string {
  return db.latestServiceFor(handle) ?? (handle.includes("@") ? "iMessage" : "SMS");
}

async function sendQueuedAlert(db: MessagesDb, alert: QueuedAlert, hubToken: string): Promise<void> {
  const sent = await sendWithMessagesApp(alert.phone, serviceFor(db, alert.phone), `${REPLY_PREFIX}${alert.body}`)
    .then(() => true)
    .catch((error: unknown) => {
      console.error(`Could not send an area alert to ${mask(alert.phone)}:`, (error as Error).message);
      return false;
    });
  if (sent) {
    lastActiveBySender.set(alert.phone, Date.now());
    console.log(`Sent an area alert to ${mask(alert.phone)}`);
  }
  await reportAlertDelivery(hubToken, alert.id, sent);
}

async function deliverQueuedAlerts(db: MessagesDb): Promise<void> {
  if (!token || dryRun) return;
  const hubToken = token;
  for (const alert of await claimQueuedAlerts(hubToken)) await sendQueuedAlert(db, alert, hubToken);
}

const CONNECTION_MESSAGES = {
  valid: "Connected: answers come from the Leaf Doctor server (Claude), with offline rules as backup.",
  rejected: "The server REJECTED LEAF_BRIDGE_TOKEN in bridge/.env, so answers will use the offline rules only. Copy it again with: cd backend && npx convex env get HUB_TOKEN",
  unreachable: "Couldn't reach the Leaf Doctor server right now. Answering offline until it's back.",
} as const;

async function reportServerConnection(): Promise<void> {
  if (!token) {
    console.log("No LEAF_BRIDGE_TOKEN in bridge/.env: answering with offline rules only.");
    return;
  }
  const result = await checkHubToken(DEFAULT_BACKEND_URL, token);
  console.log(CONNECTION_MESSAGES[result]);
  if (result === "rejected") token = undefined;
}

function openDatabase(): MessagesDb {
  try {
    return new MessagesDb();
  } catch (error) {
    console.error(`Cannot read ${MESSAGES_DB_PATH}: ${(error as Error).message}`);
    console.error("Give your terminal app Full Disk Access: System Settings > Privacy & Security > Full Disk Access, then restart the terminal.");
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const db = openDatabase();
  let lastRowId = db.latestRowId();
  console.log(`Leaf Doctor bridge ${dryRun ? "(dry run, nothing is sent) " : ""}is listening for texts that start with "${KEYWORD}".`);
  await reportServerConnection();

  let lastAlertCheck = 0;
  for (;;) {
    for (const message of mergeCaptions(db.messagesAfter(lastRowId))) {
      lastRowId = message.rowId;
      await handle(message).catch((error) => console.error(`Could not answer ${mask(message.sender)}:`, (error as Error).message));
    }
    if (Date.now() - lastAlertCheck >= ALERT_POLL_MS) {
      lastAlertCheck = Date.now();
      await deliverQueuedAlerts(db).catch((error) => console.error("Could not check for area alerts:", (error as Error).message));
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

void main();
