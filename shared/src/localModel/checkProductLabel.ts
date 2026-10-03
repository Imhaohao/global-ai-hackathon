import type { TaskResult } from "./localModel.ts";
import type { ProductLabel } from "./readProductLabel.ts";

export type LabelVerdict =
  | { kind: "ask_a_person"; reason: string }
  | { kind: "expired"; expiry: string }
  | { kind: "flagged_batch"; batchNumber: string }
  | { kind: "no_registration" }
  | { kind: "label_ok" };

export interface LabelCheckContext {
  today: Date;
  flaggedBatchNumbers: ReadonlySet<string>;
}

function normalizeBatch(batch: string): string {
  return batch.replace(/\s+/g, "").toUpperCase();
}

function isExpired(expiry: string, today: Date): boolean {
  const [year, month] = expiry.split("-").map(Number);
  const firstDayAfterExpiryMonth = new Date(Date.UTC(year, month, 1));
  return today.getTime() >= firstDayAfterExpiryMonth.getTime();
}

function isFlagged(label: ProductLabel, flagged: ReadonlySet<string>): boolean {
  if (!label.batchNumber) return false;
  const batch = normalizeBatch(label.batchNumber);
  return [...flagged].some((flaggedBatch) => normalizeBatch(flaggedBatch) === batch);
}

export function checkProductLabel(reading: TaskResult<ProductLabel>, context: LabelCheckContext): LabelVerdict {
  if (reading.status === "unsure") return { kind: "ask_a_person", reason: reading.reason };
  const label = reading.value;
  if (label.kind === "unreadable") return { kind: "ask_a_person", reason: "label could not be read" };
  if (isFlagged(label, context.flaggedBatchNumbers)) return { kind: "flagged_batch", batchNumber: label.batchNumber! };
  if (label.expiry && isExpired(label.expiry, context.today)) return { kind: "expired", expiry: label.expiry };
  if (!label.registrationNumber) return { kind: "no_registration" };
  return { kind: "label_ok" };
}
