import type { DiseaseKey } from "../types.ts";
import type { FarmerReport } from "./parseFarmerMessage.ts";
import type { VerdictToPhrase } from "./phraseVerdict.ts";

// Synthetic test data written by the team, not real farmer messages. Swahili needs review by a native speaker.
// None of these appear in the prompt's worked examples.

export interface FarmerMessageCase {
  message: string;
  expected: Partial<Omit<FarmerReport, "symptomsInEnglish" | "language">>;
  disease?: DiseaseKey;
}

const noSpraying = { sprayProduct: "not_mentioned", sprayedWhen: "not_mentioned", rainAfterSpraying: "not_mentioned" } as const;

export const FARMER_MESSAGE_CASES: FarmerMessageCase[] = [
  { message: "majani yana unga wa rangi ya machungwa chini", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "rust" },
  { message: "madoa ya manjano juu ya jani na unga wa machungwa chini ya jani", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "rust" },
  { message: "majani ya chini yanapukutika na yana unga wa machungwa", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "rust" },
  { message: "madoa ya kahawia yenye duara na katikati ya kijivu", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "cercospora" },
  { message: "jani lina madoa ya mviringo ya kahawia na mzunguko wa manjano", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "cercospora" },
  { message: "kuna vichuguu ndani ya jani na mabaka ya kahawia kama karatasi", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "miner" },
  { message: "naona mistari kama minyoo ndani ya majani", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "miner" },
  { message: "ncha za matawi zinakuwa nyeusi baada ya baridi na upepo", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "phoma" },
  { message: "majani ni ya kijani na yanang'aa, hakuna shida", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "healthy" },
  { message: "orange powder under the leaves and leaves falling", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "rust" },
  { message: "majani yana brown spots zenye ring na grey center", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "cercospora" },
  { message: "leaves ziko na unga orange chini", expected: { topic: "leaf_symptoms", ...noSpraying }, disease: "rust" },
  { message: "nimenyunyiza dawa ya bluu leo asubuhi, hakuna mvua", expected: { topic: "spraying", sprayProduct: "copper", sprayedWhen: "today", rainAfterSpraying: "no" } },
  { message: "nilipiga copper oxychloride wiki hii lakini mvua kubwa ikanyesha jioni", expected: { topic: "spraying", sprayProduct: "copper", sprayedWhen: "this_week", rainAfterSpraying: "yes" } },
  { message: "I sprayed Kocide yesterday and it rained after", expected: { topic: "spraying", sprayProduct: "copper", sprayedWhen: "yesterday", rainAfterSpraying: "yes" } },
  { message: "nilinyunyiza dawa ya wadudu jana", expected: { topic: "spraying", sprayProduct: "insecticide", sprayedWhen: "yesterday", rainAfterSpraying: "not_mentioned" } },
  { message: "nimepiga dawa ya magugu leo", expected: { topic: "spraying", sprayProduct: "herbicide", sprayedWhen: "today", rainAfterSpraying: "not_mentioned" } },
  { message: "nilinyunyiza dawa mwezi uliopita, sijui jina lake", expected: { topic: "spraying", sprayProduct: "unknown", sprayedWhen: "earlier", rainAfterSpraying: "not_mentioned" } },
  { message: "sprayed copper last month, no rain since", expected: { topic: "spraying", sprayProduct: "copper", sprayedWhen: "earlier", rainAfterSpraying: "no" } },
  { message: "nimenyunyiza dawa ya kijani jana na mvua haikunyesha", expected: { topic: "spraying", sprayProduct: "copper", sprayedWhen: "yesterday", rainAfterSpraying: "no" } },
  { message: "nimeweka mbolea ya CAN wiki hii", expected: { topic: "fertilizer", ...noSpraying } },
  { message: "bei ya kahawa ni ngapi leo?", expected: { topic: "other", ...noSpraying } },
  { message: "habari, mvua imenyesha sana hapa", expected: { topic: "other", ...noSpraying } },
  { message: "nilinyunyiza copper jana na sasa majani yana unga wa machungwa chini", expected: { sprayProduct: "copper", sprayedWhen: "yesterday" }, disease: "rust" },
];

export const VERDICT_CASES: VerdictToPhrase[] = [
  {
    english: "Rain came 3 hours after you sprayed, so most of the copper washed off. Spray again on a dry morning with no rain for 8 hours.",
    approvedSwahili: "Mvua ilinyesha saa 3 baada ya kunyunyiza, kwa hiyo shaba nyingi ilisombwa. Nyunyizia tena asubuhi kavu isiyo na mvua kwa saa 8.",
    mustKeep: ["3", "8"],
    maxChars: 160,
  },
  {
    english: "More than 20 percent of your leaves are sick. Copper will not cure them. Remove and burn the sick leaves first.",
    approvedSwahili: "Zaidi ya asilimia 20 ya majani yameugua. Shaba haitayaponya. Ondoa na uchome majani yaliyougua kwanza.",
    mustKeep: ["20"],
    maxChars: 160,
  },
  {
    english: "This bag expired in 2026-08. Do not use it. Take it back to the shop.",
    approvedSwahili: "Mfuko huu uliisha muda 2026-08. Usiutumie. Urudishe dukani.",
    mustKeep: ["2026"],
    maxChars: 160,
  },
];
