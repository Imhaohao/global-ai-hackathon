import { BRAND_NAME, OPT_OUT_FOOTER } from "../../shared/src/index.ts";

export const SMS_NUMBER_DISPLAY = "+1 650-644-4731";
const CONTACT_EMAIL = "imzihaoi@gmail.com";
const LAST_UPDATED = "October 3, 2026";

const STYLES = `
  :root { --surface: #f6f3ec; --text: #1f2a24; --muted: #55625a; --accent: #1f5136; --panel: #ffffff; }
  body { margin: 0; background: var(--surface); color: var(--text); font: 17px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 680px; margin: 0 auto; padding: 48px 20px 64px; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 8px; }
  h2 { font-size: 1.2rem; margin: 32px 0 8px; }
  .updated { color: var(--muted); margin: 0 0 24px; }
  .number { font-size: 1.6rem; font-weight: 700; color: var(--accent); }
  .exchange { background: var(--panel); padding: 16px 20px; border-radius: 12px; box-shadow: 0 1px 3px rgb(0 0 0 / 0.08); }
  .exchange p { margin: 8px 0; }
  .who { font-weight: 600; }
  a { color: var(--accent); }
`;

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | ${BRAND_NAME}</title><style>${STYLES}</style></head><body><main>${body}</main></body></html>`;
}

export const privacyPolicyPage = page(
  "Privacy Policy",
  `<h1>Privacy Policy</h1>
<p class="updated">${BRAND_NAME}, last updated ${LAST_UPDATED}</p>
<p>${BRAND_NAME} is a free advice line that helps coffee farmers identify and manage coffee leaf diseases by SMS and phone. This policy explains what we collect and how we use it.</p>
<h2>What we collect</h2>
<p>When you text ${BRAND_NAME}, we receive your phone number, the text of your messages, and the time they were sent.</p>
<h2>How we use it</h2>
<p>We use your messages only to answer your coffee plant questions. We keep up to the last eight messages of a conversation for 24 hours so that follow-up answers make sense, and we record when we last replied to your number so we can limit replies to 5 every 10 minutes.</p>
<p>To write answers, the text of your messages is processed by our AI provider (Anthropic), and messages are delivered through our SMS provider (Twilio). They process this data only to provide the service to us.</p>
<h2>Sharing</h2>
<p>We do not sell or share your SMS opt-in data or personal information with third parties for marketing purposes.</p>
<h2>Your choices</h2>
<p>Reply STOP at any time to stop receiving messages. To ask us to delete your messages, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>`,
);

export const termsPage = page(
  "Terms & Conditions",
  `<h1>Terms &amp; Conditions</h1>
<p class="updated">${BRAND_NAME}, last updated ${LAST_UPDATED}</p>
<p>These terms cover the ${BRAND_NAME} coffee plant advice line.</p>
<h2>SMS Terms</h2>
<p><strong>Program:</strong> ${BRAND_NAME} answers questions about coffee leaf diseases. You start every conversation by texting ${SMS_NUMBER_DISPLAY}. We only reply to messages you send and never send marketing messages.</p>
<p><strong>Message frequency:</strong> one reply per message you send, at most 5 replies every 10 minutes.</p>
<p><strong>Cost:</strong> ${BRAND_NAME} is free. Message and data rates may apply from your mobile carrier.</p>
<p><strong>Opt out:</strong> reply STOP to stop all messages. Reply START to resume.</p>
<p><strong>Help:</strong> reply HELP, or email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>
<p>Carriers are not liable for delayed or undelivered messages.</p>
<h2>Advice disclaimer</h2>
<p>${BRAND_NAME} gives general guidance based on what you describe and cannot see your plants. Check any chemical treatment with your local agricultural extension officer before use.</p>
<p>See our <a href="/privacy">Privacy Policy</a>.</p>`,
);

export const textUsPage = page(
  "Text us about your coffee leaves",
  `<h1>Sick coffee leaves? Text us.</h1>
<p>Describe what you see on your coffee leaves and text it to</p>
<p class="number">${SMS_NUMBER_DISPLAY}</p>
<p>${BRAND_NAME} replies with what the problem probably is and what to do, in your language. It is free; message and data rates may apply. Reply STOP to opt out at any time, HELP for help. See our <a href="/terms">Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a>.</p>
<h2>Example conversation</h2>
<div class="exchange">
<p><span class="who">You send:</span> orange powder under my coffee leaves</p>
<p><span class="who">You receive:</span> ${BRAND_NAME}: This sounds like Coffee leaf rust. Act soon. What to do: 1) Check the underside of lower leaves often. 2) Pick off and burn or bury leaves and branches with orange spots. 3) Prune and thin shade and weeds so air moves and leaves dry faster.<br>${OPT_OUT_FOOTER}</p>
<p><span class="who">You send:</span> STOP</p>
<p><span class="who">You receive:</span> You have successfully been unsubscribed. You will not receive any more messages from this number. Reply START to resubscribe.</p>
</div>`,
);
