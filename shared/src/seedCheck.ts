import type { SwahiliLine } from "./actionCard.sw.ts";
import { KNOWN_CONTACTS } from "./contacts.ts";
import type { AppLanguage, Contact } from "./contract.ts";
import { fitToSms } from "./smsReply.ts";

export const SEED_CHECK_CONTACT_ID = "kephis-seed-check";

const SEED_CHECK_COMMANDS = new Set(["seed", "seeds", "seed check", "check seed", "check seeds", "mbegu", "kephis"]);

export interface SeedCheckCopy {
  steps: string[];
  result: string;
  coverage: string;
}

const SEED_CHECK_EN = {
  stepSticker: "Find the KEPHIS sticker on the seed packet.",
  stepScratch: "Scratch the sticker to show the code.",
  stepText: "Text the code to {shortCode}. It is free.",
  result: "KEPHIS replies to say if the seed is genuine. A genuine code does not prove the seed was stored well.",
  coverage: "This works for certified seed sold in packets. Nursery seedlings usually have no sticker, so ask your field officer about them.",
  noContact: "Ask your field officer how to check if a seed packet is genuine.",
};

type SeedCheckKey = keyof typeof SEED_CHECK_EN;

function draft(text: string): SwahiliLine {
  return { text, reviewed: false };
}

export const SEED_CHECK_SW: Record<SeedCheckKey, SwahiliLine> = {
  stepSticker: draft("Tafuta kibandiko cha KEPHIS kwenye pakiti ya mbegu."),
  stepScratch: draft("Kwangua kibandiko ili uone namba ya siri."),
  stepText: draft("Tuma namba hiyo kwa SMS kwenda {shortCode}. Ni bure."),
  result: draft("KEPHIS itakujibu kama mbegu ni halisi. Namba halisi haithibitishi kwamba mbegu ilihifadhiwa vizuri."),
  coverage: draft("Hii ni kwa mbegu zilizothibitishwa zinazouzwa kwenye pakiti. Miche ya kitalu mara nyingi haina kibandiko, kwa hiyo muulize afisa ugani."),
  noContact: draft("Muulize afisa ugani jinsi ya kujua kama pakiti ya mbegu ni halisi."),
};

function line(key: SeedCheckKey, language: AppLanguage): string {
  const swahili = SEED_CHECK_SW[key];
  return language === "sw" && swahili.reviewed ? swahili.text : SEED_CHECK_EN[key];
}

export function seedCheckContact(contacts: Contact[] = KNOWN_CONTACTS): Contact | null {
  return contacts.find((contact) => contact.id === SEED_CHECK_CONTACT_ID && contact.verified && contact.phone) ?? null;
}

export function seedCheckCopy(language: AppLanguage, contact: Contact | null = seedCheckContact()): SeedCheckCopy | null {
  if (!contact) return null;
  return {
    steps: [
      line("stepSticker", language),
      line("stepScratch", language),
      line("stepText", language).replace("{shortCode}", contact.phone),
    ],
    result: line("result", language),
    coverage: line("coverage", language),
  };
}

function normalizeCommand(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function isSeedCheckRequest(text: string): boolean {
  return SEED_CHECK_COMMANDS.has(normalizeCommand(text));
}

export function seedCheckSms(language: AppLanguage, contact: Contact | null = seedCheckContact()): string {
  const copy = seedCheckCopy(language, contact);
  if (!copy) return fitToSms(line("noContact", language));
  const numbered = copy.steps.map((step, index) => `${index + 1}) ${step}`).join(" ");
  return fitToSms(`${numbered} ${copy.result} ${copy.coverage}`);
}

export function seedCheckReplyFor(text: string): string | null {
  if (!isSeedCheckRequest(text)) return null;
  return seedCheckSms(normalizeCommand(text) === "mbegu" ? "sw" : "en");
}
