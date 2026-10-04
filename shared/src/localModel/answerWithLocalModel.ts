import { buildRuleBasedReply } from "../advicePolicy.ts";
import type { AppLanguage } from "../contract.ts";
import { DISEASES } from "../diseases.ts";
import { looksLikeKikuyu, UNSUPPORTED_LANGUAGE_REPLY } from "../languageGuard.ts";
import { seedCheckReplyFor } from "../seedCheck.ts";
import { COMPLIANCE_OVERHEAD_CHARS } from "../smsCompliance.ts";
import { matchWithModelHelp } from "./assistedMatch.ts";
import type { AssistedMatch } from "./assistedMatch.ts";
import { unsure } from "./localModel.ts";
import type { LocalModel, TaskResult } from "./localModel.ts";
import { parseFarmerMessage } from "./parseFarmerMessage.ts";
import type { FarmerReport } from "./parseFarmerMessage.ts";

export interface LocalModelAnswer {
  reply: string;
  report: TaskResult<FarmerReport>;
  match: AssistedMatch;
}

function repliesInSwahili(report: TaskResult<FarmerReport>): boolean {
  return report.status === "ok" && (report.value.language === "sw" || report.value.language === "mixed");
}

export async function answerWithLocalModel(model: LocalModel | null, message: string): Promise<LocalModelAnswer> {
  const seedCheckReply = seedCheckReplyFor(message);
  if (seedCheckReply) return { reply: seedCheckReply, report: unsure("seed check command"), match: { kind: "noMatch" } };
  if (looksLikeKikuyu(message)) {
    return { reply: UNSUPPORTED_LANGUAGE_REPLY, report: unsure("message looks like Kikuyu"), match: { kind: "noMatch" } };
  }
  const report = model ? await parseFarmerMessage(model, message) : unsure("no on-device model loaded");
  const match = matchWithModelHelp(message, report, DISEASES);
  const language: AppLanguage = repliesInSwahili(report) ? "sw" : "en";
  const reply = buildRuleBasedReply(match, language, COMPLIANCE_OVERHEAD_CHARS);
  return { reply, report, match };
}
