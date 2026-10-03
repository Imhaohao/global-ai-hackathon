import type { CaseSummaryInput } from "./contract.ts";

export function formatCaseSummarySms(input: CaseSummaryInput): string {
  return `Leaf Doctor case ${input.observation.id}: ${input.card.headline}`;
}
