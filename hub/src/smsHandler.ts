import { CARRIER_REPLIES, carrierCommandFor, formatOutgoingSms } from "../../shared/src/smsCompliance.ts";
import type { FarmerReport } from "../../shared/src/localModel/index.ts";
import type { Answer, AnswerSource } from "./answerQuestion";
import type { IncomingSms } from "../modules/sms-gateway";

export type RecordExchange = (sms: IncomingSms, reply: string, source: AnswerSource, modelReading: FarmerReport | null) => void;
export type SmsSender = (to: string, body: string) => Promise<void>;

async function sendExchange(
  sms: IncomingSms,
  reply: string,
  source: AnswerSource,
  modelReading: FarmerReport | null,
  send: SmsSender,
  recordExchange: RecordExchange,
  setProblem: (problem: "send-failed" | null) => void,
  onSent?: () => void,
): Promise<void> {
  try {
    await send(sms.from, reply);
    onSent?.();
    setProblem(null);
    recordExchange(sms, reply, source, modelReading);
  } catch {
    setProblem("send-failed");
  }
}

export async function handleCarrierSms(
  sms: IncomingSms,
  setOptedOut: (sender: string, optedOut: boolean) => Promise<boolean>,
  send: SmsSender,
  recordExchange: RecordExchange,
  setProblem: (problem: "send-failed" | null) => void,
): Promise<boolean> {
  const command = carrierCommandFor(sms.body);
  if (!command) return false;
  const needsOptOutChange = command === "stop" || command === "start";
  if (needsOptOutChange && !(await setOptedOut(sms.from, command === "stop"))) return true;
  const reply = formatOutgoingSms(CARRIER_REPLIES[command], false);
  await sendExchange(sms, reply, "offline", null, send, recordExchange, setProblem);
  return true;
}

export async function handleQuestionSms(
  sms: IncomingSms,
  isOptedOut: () => boolean,
  shouldReply: () => boolean,
  answer: () => Promise<Answer>,
  isFirstReply: () => boolean,
  markReplied: () => void,
  send: SmsSender,
  recordExchange: RecordExchange,
  setProblem: (problem: "send-failed" | null) => void,
): Promise<void> {
  if (isOptedOut() || !shouldReply()) return;
  const result = await answer();
  if (isOptedOut()) return;
  const reply = formatOutgoingSms(result.reply, isFirstReply());
  await sendExchange(sms, reply, result.source, result.modelReading, send, recordExchange, setProblem, markReplied);
}
