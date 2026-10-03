import { matchSymptoms } from "../matchSymptoms.ts";
import type { ReplyMatch } from "../smsReply.ts";
import type { DiseaseCatalog } from "../types.ts";
import type { TaskResult } from "./localModel.ts";
import { textForSymptomMatcher } from "./parseFarmerMessage.ts";
import type { FarmerReport } from "./parseFarmerMessage.ts";

export type AssistedMatch = ReplyMatch;

export function matchWithModelHelp(
  message: string,
  report: TaskResult<FarmerReport>,
  catalog: DiseaseCatalog,
): AssistedMatch {
  const fromFarmerWords = matchSymptoms(message, catalog);
  if (fromFarmerWords.kind === "confident") return fromFarmerWords;
  const withTranslation = matchSymptoms(textForSymptomMatcher(message, report), catalog);
  if (withTranslation.kind === "confident") return { kind: "confirmFirst", best: withTranslation.best };
  return fromFarmerWords.kind === "noMatch" ? withTranslation : fromFarmerWords;
}
