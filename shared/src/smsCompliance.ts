import { fitToSms } from "./smsReply.ts";

export const BRAND_NAME = "Leaf Doctor";
export const OPT_OUT_FOOTER = `${BRAND_NAME}: Reply STOP to opt out, HELP for help. Msg&data rates may apply.`;

const CARRIER_KEYWORDS = new Set([
  "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout",
  "start", "unstop", "help", "info",
]);

export function isCarrierKeyword(text: string): boolean {
  return CARRIER_KEYWORDS.has(text.trim().toLowerCase().replace(/[^a-z]/g, ""));
}

export function withOptOutFooter(reply: string): string {
  const footer = `\n${OPT_OUT_FOOTER}`;
  return `${fitToSms(reply, footer.length)}${footer}`;
}
