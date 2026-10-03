const KIKUYU_LETTERS = /[ĩũĨŨ]/;

// Chosen from the FLORES-200 Kikuyu dev split: frequent there, absent from the Swahili dev split.
// Words that are also common Swahili or Kenyan SMS words (kuuma, mundu, uyu, iyo, ati, bata, hari) are left out.
const KIKUYU_WORDS = new Set([
  "cia", "iria", "uria", "kuri", "muno", "thi", "undu", "mbere", "andu", "mirongo", "imwe",
  "makiria", "njira", "maundu", "ucio", "ngiri", "nginya", "riria", "kuria", "bururi", "magana",
  "ikumi", "iguru", "kundu", "wira", "ikoragwo", "uhoro", "umwe", "kaingi", "gukorwo", "kiria",
  "mweri", "muthenya", "uguo", "niguo",
]);

export const MIN_KIKUYU_WORD_HITS = 2;

export const UNSUPPORTED_LANGUAGE_REPLY =
  "Leaf Doctor cannot read Kikuyu yet. Please write in Swahili or English, or show the leaves to your field officer.";

function kikuyuWordHits(text: string): number {
  const words = new Set(text.toLowerCase().match(/[a-z']+/g) ?? []);
  let hits = 0;
  for (const word of words) if (KIKUYU_WORDS.has(word)) hits++;
  return hits;
}

export function looksLikeKikuyu(text: string): boolean {
  return KIKUYU_LETTERS.test(text) || kikuyuWordHits(text) >= MIN_KIKUYU_WORD_HITS;
}
