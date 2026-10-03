import { evaluateReply } from "../../shared/src/index.ts";
import { askLeafDoctor } from "./askLeafDoctor.ts";
import { MESSAGES_DB_PATH, MessagesDb, type IncomingMessage } from "./messagesDb.ts";
import { sendWithMessagesApp } from "./sendMessage.ts";
import { decideIncoming, isInSession, KEYWORD } from "./sessionRules.ts";

const POLL_MS = 3000;
const REPLY_PREFIX = "Leaf Doctor: ";
const FIRST_REPLY_FOOTER = "\n(Automated coffee leaf advice. Text STOP to end.)";
const WELCOME_REPLY = `${REPLY_PREFIX}Hi! Tell me what you see on your coffee leaves: the colour of the spots, top or underneath, and any powder, rings or tunnels.${FIRST_REPLY_FOOTER}`;
const GOODBYE_REPLY = `${REPLY_PREFIX}Okay, I'll stop. Text ${KEYWORD} with your question any time.`;

const dryRun = process.argv.includes("--dry-run");
const token = process.env.LEAF_BRIDGE_TOKEN?.trim() || undefined;
const lastActiveBySender = new Map<string, number>();
const replyTimesBySender = new Map<string, number[]>();

function mask(handle: string): string {
  return handle.includes("@") ? `${handle.slice(0, 2)}...@${handle.split("@")[1]}` : `...${handle.slice(-4)}`;
}

function claimReplySlot(sender: string, now: number): boolean {
  const decision = evaluateReply(replyTimesBySender.get(sender) ?? [], now);
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

async function replyFor(message: IncomingMessage, question: string, isNewSession: boolean): Promise<string> {
  const { reply, source } = await askLeafDoctor(message.sender, question, token);
  console.log(`Answered ${mask(message.sender)} (${source})`);
  return `${REPLY_PREFIX}${reply}${isNewSession ? FIRST_REPLY_FOOTER : ""}`;
}

async function handle(message: IncomingMessage): Promise<void> {
  if (message.isGroupChat || !message.text) return;
  const now = Date.now();
  const lastActiveAt = lastActiveBySender.get(message.sender);
  const decision = decideIncoming(message.text, lastActiveAt, now);
  if (decision.kind === "ignore" || !claimReplySlot(message.sender, now)) return;

  if (decision.kind === "end") {
    lastActiveBySender.delete(message.sender);
    await deliver(message, GOODBYE_REPLY);
    return;
  }
  const isNewSession = !isInSession(lastActiveAt, now);
  lastActiveBySender.set(message.sender, now);
  const text = decision.kind === "welcome" ? WELCOME_REPLY : await replyFor(message, decision.question, isNewSession);
  await deliver(message, text);
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
  console.log(token ? "Answers come from the Leaf Doctor server, with offline rules as backup." : "No LEAF_BRIDGE_TOKEN set: answering with offline rules only.");

  for (;;) {
    for (const message of db.messagesAfter(lastRowId)) {
      lastRowId = message.rowId;
      await handle(message).catch((error) => console.error(`Could not answer ${mask(message.sender)}:`, (error as Error).message));
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

void main();
