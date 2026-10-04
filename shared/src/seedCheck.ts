import { adviceTextFor, type AdviceChannel } from "./adviceText.ts";
import { KNOWN_CONTACTS } from "./contacts.ts";
import type { AppLanguage, Contact } from "./contract.ts";
import type { SeedCheckKey } from "./seedCheckCopy.ts";
import { fitToSms } from "./smsReply.ts";

export const SEED_CHECK_CONTACT_ID = "kephis-seed-check";

const SEED_CHECK_COMMANDS = new Set(["seed", "seeds", "seed check", "check seed", "check seeds", "mbegu", "kephis"]);

export interface SeedCheckCopy {
  steps: string[];
  result: string;
  coverage: string;
}

function line(key: SeedCheckKey, language: AppLanguage, channel: AdviceChannel): string {
  return adviceTextFor(language, channel).seedCheck[key];
}

export function seedCheckContact(contacts: Contact[] = KNOWN_CONTACTS): Contact | null {
  return contacts.find((contact) => contact.id === SEED_CHECK_CONTACT_ID && contact.verified && contact.phone) ?? null;
}

export function seedCheckCopy(
  language: AppLanguage,
  contact: Contact | null = seedCheckContact(),
  channel: AdviceChannel = "app",
): SeedCheckCopy | null {
  if (!contact) return null;
  return {
    steps: [
      line("stepSticker", language, channel),
      line("stepScratch", language, channel),
      line("stepText", language, channel).replace("{shortCode}", contact.phone),
    ],
    result: line("result", language, channel),
    coverage: line("coverage", language, channel),
  };
}

function normalizeCommand(text: string): string {
  return text.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function isSeedCheckRequest(text: string): boolean {
  return SEED_CHECK_COMMANDS.has(normalizeCommand(text));
}

export function seedCheckSms(language: AppLanguage, contact: Contact | null = seedCheckContact()): string {
  const copy = seedCheckCopy(language, contact, "sms");
  if (!copy) return fitToSms(line("noContact", language, "sms"));
  const numbered = copy.steps.map((step, index) => `${index + 1}) ${step}`).join(" ");
  return fitToSms(`${numbered} ${copy.result} ${copy.coverage}`);
}

export function seedCheckReplyFor(text: string): string | null {
  if (!isSeedCheckRequest(text)) return null;
  return seedCheckSms(normalizeCommand(text) === "mbegu" ? "sw" : "en");
}
