// What Noor's basic phone shows and which keys light, frame by frame, across the story scene. Every message text is
// the real text: her question and the bot's reply are copied from ScreenRecording 22-52-31; the SHOP and alert texts
// are what shared/src/remedyFinder.ts and shared/src/neighbourAlerts.ts produce. Frames are absolute.
import type { KeyId } from "./components/FlipPhone";
import type { LcdView } from "./components/Lcd";
import { VOICE_START, cue } from "./timeline";

export const NOOR_QUESTION = "LEAF doctor, my crops have yellow and brown circles all over their leaves.";

export const TYPING = { from: cue("sms", "Just") - 6, to: cue("sms", "reply") - 10 };
export const SENT_AT = cue("sms", "reply") - 6;
export const SEED_DIGITS = { from: cue("followup", "send"), step: 6 };
export const SEED_SENT_AT = cue("followup", "ninety-three") + 6;

/** One page of a real message, shown from frame `at`. Pages split the real text at word boundaries, in order. */
type Page = { at: number; view: LcdView; tag?: "Demo data" };

const incoming = (at: number, text: string, tag?: Page["tag"]): Page => ({ at, view: { kind: "message", from: "in", text, at }, tag });
const outgoing = (at: number, text: string): Page => ({ at, view: { kind: "message", from: "out", text, at } });

function typed(frame: number) {
  const share = Math.min(Math.max((frame - TYPING.from) / (TYPING.to - TYPING.from), 0), 1);
  return NOOR_QUESTION.slice(0, Math.round(share * NOOR_QUESTION.length));
}

function seedRecipient(frame: number) {
  const digits = Math.min(Math.max(Math.floor((frame - SEED_DIGITS.from) / SEED_DIGITS.step) + 1, 0), 4);
  return "1393".slice(0, digits);
}

const PAGES: Page[] = [
  incoming(cue("sms", "reply"), "Leaf Doctor: This looks like brown eye spot (Cercospora)"),
  incoming(cue("sms", "what") - 6, "1) Feed trees with manure or balanced fertilizer."),
  outgoing(VOICE_START.followup + 2, "How can I get these fertilizers?"),
  incoming(cue("followup", "follow-up") + 6, "Leaf Doctor: Manure is the cheapest:"),
  outgoing(cue("followup", "SHOP") - 2, "SHOP"),
  incoming(cue("followup", "find") + 2, "Which town or market are you near?"),
  outgoing(cue("followup", "buy") - 6, "Othaya"),
  incoming(cue("followup", "buy") + 6, "1) Othaya Farmers Agrovet, Othaya town, 0712 000001.", "Demo data"),
  { at: cue("followup", "and") + 4, view: { kind: "compose", to: "", body: "", sentAt: SEED_SENT_AT } },
];

function pageAt(frame: number): Page | undefined {
  return [...PAGES].reverse().find((page) => frame >= page.at);
}

/** The screen at a frame: Noor's question while she types, then the latest real message page. */
export function lcdAt(frame: number): { view: LcdView; tag?: Page["tag"]; envelope: boolean } {
  const page = pageAt(frame);
  if (!page) return { view: { kind: "compose", to: "Leaf Doctor", body: typed(frame), sentAt: SENT_AT }, envelope: false };
  if (page.view.kind === "compose") return { view: { ...page.view, to: seedRecipient(frame) }, envelope: false };
  return { view: page.view, tag: page.tag, envelope: page.view.kind === "message" && page.view.from === "in" };
}

/** Frames at which each incoming message lands, for the arrival chirp. */
export const ARRIVALS = PAGES.filter((page) => page.view.kind === "message" && page.view.from === "in").map((page) => page.at);

const LETTER_KEYS: Record<string, KeyId> = Object.fromEntries(
  (["2abc", "3def", "4ghi", "5jkl", "6mno", "7pqrs", "8tuv", "9wxyz"] as const).flatMap((group) => [...group.slice(1)].map((letter) => [letter, group[0] as KeyId])),
);

function keyForCharacter(character: string): KeyId {
  if (character === " ") return "0";
  return LETTER_KEYS[character.toLowerCase()] ?? "1";
}

/** Every key press in the story: Noor's question letter by letter, the four digits of 1393 and the call key. */
export const KEY_PRESSES: { key: KeyId; at: number }[] = [
  ...[...NOOR_QUESTION].map((character, index) => ({ key: keyForCharacter(character), at: TYPING.from + Math.round((index / NOOR_QUESTION.length) * (TYPING.to - TYPING.from)) })),
  ...[..."1393"].map((digit, index) => ({ key: digit as KeyId, at: SEED_DIGITS.from + index * SEED_DIGITS.step })),
];

const LIGHT_FRAMES = 7;

/** How brightly each key's backlight glows at a frame: full on the press, fading over a few frames. */
export function litAt(frame: number): Partial<Record<KeyId, number>> {
  const lit: Partial<Record<KeyId, number>> = {};
  for (const press of KEY_PRESSES) {
    const age = frame - press.at;
    if (age < 0 || age > LIGHT_FRAMES) continue;
    lit[press.key] = Math.max(lit[press.key] ?? 0, 1 - age / LIGHT_FRAMES);
  }
  return lit;
}
