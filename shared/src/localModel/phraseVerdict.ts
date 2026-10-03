import type { LocalModel } from "./localModel.ts";

export interface VerdictToPhrase {
  english: string;
  approvedSwahili: string;
  mustKeep: string[];
  maxChars: number;
}

export interface PhrasedVerdict {
  text: string;
  source: "model" | "approved_text";
  rejectedBecause?: string;
}

export const PHRASE_SYSTEM_PROMPT = `You turn advice for a coffee farmer into one or two short, friendly Swahili sentences that a farmer with little schooling understands. Keep every number, product name and time exactly as given. Do not add advice, numbers, products or warnings that are not in the English text. Reply with the Swahili text only.`;

function numbersIn(text: string): string[] {
  return text.match(/\d+(?:[.,]\d+)?/g) ?? [];
}

export function phrasingProblem(candidate: string, verdict: VerdictToPhrase): string | null {
  const text = candidate.trim();
  if (text.length === 0) return "empty";
  if (text.length > verdict.maxChars) return `longer than ${verdict.maxChars} characters`;
  const lower = text.toLowerCase();
  const dropped = verdict.mustKeep.find((token) => !lower.includes(token.toLowerCase()));
  if (dropped) return `dropped "${dropped}"`;
  const allowedNumbers = new Set(numbersIn(verdict.english));
  const invented = numbersIn(text).find((number) => !allowedNumbers.has(number));
  if (invented) return `invented the number ${invented}`;
  return null;
}

export async function phraseVerdictInSwahili(model: LocalModel, verdict: VerdictToPhrase): Promise<PhrasedVerdict> {
  let candidate: string;
  try {
    candidate = await model.complete({ system: PHRASE_SYSTEM_PROMPT, prompt: verdict.english, maxTokens: 160 });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { text: verdict.approvedSwahili, source: "approved_text", rejectedBecause: `model failed: ${reason}` };
  }
  const problem = phrasingProblem(candidate, verdict);
  if (problem) return { text: verdict.approvedSwahili, source: "approved_text", rejectedBecause: problem };
  return { text: candidate.trim(), source: "model" };
}
