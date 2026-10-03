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

export function isCarrierKeyword(text: string): boolean {
  return CARRIER_KEYWORDS.has(text.trim().toLowerCase().replace(/[^a-z]/g, ""));
}

export function formatOutgoingSms(reply: string, isFirstReply: boolean): string {
  const footer = isFirstReply ? `\n${OPT_OUT_FOOTER}` : "";
  return `${BRAND_PREFIX}${fitToSms(reply, BRAND_PREFIX.length + footer.length)}${footer}`;
}
