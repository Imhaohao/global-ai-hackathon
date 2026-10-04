import { ENGLISH_COPY, type CopyKey } from "./actionCard.en.ts";
import { ACTION_CARD_SW } from "./actionCard.sw.ts";
import { DISEASES } from "./diseases.ts";
import { DISEASES_SW } from "./diseases.sw.ts";
import { DEFAULT_LANGUAGE, type LanguageCode } from "./languages.ts";
import { ADVICE_TRANSLATIONS } from "./locales/index.ts";
import { SEED_CHECK_EN, SEED_CHECK_SW, type SeedCheckKey } from "./seedCheckCopy.ts";
import { DISEASE_KEYS, type DiseaseKey, type DiseaseText } from "./types.ts";

export interface AdviceText {
  copy: Record<CopyKey, string>;
  diseases: Record<DiseaseKey, DiseaseText>;
  seedCheck: Record<SeedCheckKey, string>;
  /** First thing the phone line says when a call starts in this language. */
  phoneGreeting: string;
  /** False until a native speaker has checked every line. */
  reviewed: boolean;
}

/** A translation may leave lines out; those fall back to English. */
export interface AdviceTranslation {
  copy?: Partial<Record<CopyKey, string>>;
  diseases?: Partial<Record<DiseaseKey, Partial<DiseaseText>>>;
  seedCheck?: Partial<Record<SeedCheckKey, string>>;
  phoneGreeting?: string;
  reviewed?: boolean;
}

const ENGLISH_DISEASES = Object.fromEntries(
  DISEASE_KEYS.map((key) => {
    const { name, look, tellApart, actions, urgencyReason } = DISEASES[key];
    return [key, { name, look, tellApart, actions, urgencyReason }];
  }),
) as Record<DiseaseKey, DiseaseText>;

const ENGLISH: AdviceText = {
  copy: ENGLISH_COPY,
  diseases: ENGLISH_DISEASES,
  seedCheck: SEED_CHECK_EN,
  phoneGreeting:
    "Hello, this is Leaf Doctor. I help with sick coffee plants, and you can speak to me in your own language. What do you see on your coffee leaves?",
  reviewed: true,
};

/**
 * Where the words are shown. The app marks advice no native speaker has checked;
 * a text message cannot, so it only uses checked lines and English for the rest.
 */
export type AdviceChannel = "app" | "sms";

type ReviewableLine = { text: string; reviewed: boolean };

function linesOf<Key extends string>(table: Record<Key, ReviewableLine>, checkedOnly: boolean): Partial<Record<Key, string>> {
  const lines = Object.entries<ReviewableLine>(table).filter(([, line]) => line.reviewed || !checkedOnly);
  return Object.fromEntries(lines.map(([key, line]) => [key, line.text])) as Partial<Record<Key, string>>;
}

function swahiliTranslation(channel: AdviceChannel): AdviceTranslation {
  const checkedOnly = channel === "sms";
  return {
    copy: linesOf(ACTION_CARD_SW, checkedOnly),
    diseases: DISEASES_SW,
    seedCheck: linesOf(SEED_CHECK_SW, checkedOnly),
    phoneGreeting: "Habari, mimi ni Leaf Doctor. Ninasaidia na mibuni yenye magonjwa. Niambie, unaona nini kwenye majani ya kahawa yako?",
    reviewed: [...Object.values(ACTION_CARD_SW), ...Object.values(SEED_CHECK_SW)].every((line) => line.reviewed),
  };
}

const loadedTranslations = new Map<LanguageCode, AdviceTranslation | undefined>();

/** Each generated translation is built on first use only, so unused languages cost no memory. */
function generatedTranslation(language: LanguageCode): AdviceTranslation | undefined {
  if (!loadedTranslations.has(language)) loadedTranslations.set(language, ADVICE_TRANSLATIONS[language]?.());
  return loadedTranslations.get(language);
}

function translationFor(language: LanguageCode, channel: AdviceChannel): AdviceTranslation | undefined {
  if (language === "sw") return swahiliTranslation(channel);
  const translation = generatedTranslation(language);
  if (channel === "sms" && !translation?.reviewed) return undefined;
  return translation;
}

function mergeLines<Key extends string>(english: Record<Key, string>, translated: Partial<Record<Key, string>> = {}): Record<Key, string> {
  const merged = { ...english };
  for (const key of Object.keys(english) as Key[]) {
    const line = translated[key];
    if (line) merged[key] = line;
  }
  return merged;
}

/** Steps are matched by position (the rust spray step is index 4), so a translation with a different count keeps English steps. */
function mergeDisease(english: DiseaseText, translated: Partial<DiseaseText> = {}): DiseaseText {
  const actions = translated.actions?.length === english.actions.length ? translated.actions : english.actions;
  return {
    name: translated.name || english.name,
    look: translated.look || english.look,
    tellApart: english.tellApart && (translated.tellApart || english.tellApart),
    actions,
    urgencyReason: english.urgencyReason && (translated.urgencyReason || english.urgencyReason),
  };
}

function mergeDiseases(translated: AdviceTranslation["diseases"] = {}): Record<DiseaseKey, DiseaseText> {
  return Object.fromEntries(DISEASE_KEYS.map((key) => [key, mergeDisease(ENGLISH_DISEASES[key], translated[key])])) as Record<
    DiseaseKey,
    DiseaseText
  >;
}

function buildAdviceText(language: LanguageCode, channel: AdviceChannel): AdviceText {
  const translation = translationFor(language, channel);
  if (language === DEFAULT_LANGUAGE || !translation) return ENGLISH;
  return {
    copy: mergeLines(ENGLISH.copy, translation.copy),
    diseases: mergeDiseases(translation.diseases),
    seedCheck: mergeLines(ENGLISH.seedCheck, translation.seedCheck),
    phoneGreeting: translation.phoneGreeting || ENGLISH.phoneGreeting,
    reviewed: translation.reviewed ?? false,
  };
}

/** All advice wording for one language, with English for any line the translation lacks. */
export function adviceTextFor(language: LanguageCode, channel: AdviceChannel = "app"): AdviceText {
  return buildAdviceText(language, channel);
}

export const ENGLISH_ADVICE_TEXT = ENGLISH;
