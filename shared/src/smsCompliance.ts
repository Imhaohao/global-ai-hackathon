import { fitToSms } from "./smsReply.ts";

export const BRAND_NAME = "Leaf Doctor";
export const REGISTERED_BRAND = "David";
export const SENDER_NAME = `${BRAND_NAME} by ${REGISTERED_BRAND}`;
export const OPT_OUT_FOOTER = "Reply STOP to opt out, HELP for help. Msg&data rates may apply.";
const BRAND_PREFIX = `${SENDER_NAME}: `;
export const COMPLIANCE_OVERHEAD_CHARS = BRAND_PREFIX.length + 1 + OPT_OUT_FOOTER.length;

const CARRIER_KEYWORDS = new Set([
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout",
  "start", "unstop", "help", "info",
]);

export type CarrierCommand = "stop" | "start" | "help";

export const CARRIER_REPLIES: Record<CarrierCommand, string> = {
  stop: "You have been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe.",
  start: "You have been resubscribed and will receive messages again. Reply HELP for help.",
  help: "Leaf Doctor answers coffee leaf questions by SMS. Reply STOP to opt out. Message and data rates may apply.",
};

function normalizedCarrierKeyword(text: string): string {
  return text.trim().toLowerCase().replace(/[^a-z]/g, "");
}

export function carrierCommandFor(text: string): CarrierCommand | null {
  const keyword = normalizedCarrierKeyword(text);
  if (["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout"].includes(keyword)) {
    return "stop";
  }
  if (["start", "unstop"].includes(keyword)) return "start";
  if (["help", "info"].includes(keyword)) return "help";
  return null;
}

export function isCarrierKeyword(text: string): boolean {
  return CARRIER_KEYWORDS.has(normalizedCarrierKeyword(text));
}

export function formatOutgoingSms(reply: string, isFirstReply: boolean): string {
  const footer = isFirstReply ? `\n${OPT_OUT_FOOTER}` : "";
  return `${BRAND_PREFIX}${fitToSms(reply, BRAND_PREFIX.length + footer.length)}${footer}`;
}
