import { fitToSms } from "./smsReply.ts";

export const BRAND_NAME = "Leaf Doctor";
export const OPT_OUT_FOOTER = "Reply STOP to opt out, HELP for help. Msg&data rates may apply.";
const BRAND_PREFIX = `${BRAND_NAME}: `;

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
