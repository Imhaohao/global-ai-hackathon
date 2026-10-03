import { buildActionCard, decisionLine } from "../actionCard.ts";
import type { AppLanguage } from "../contract.ts";
import { DISEASES } from "../diseases.ts";
import { DISEASES_IN_SWAHILI } from "../diseases.sw.ts";
import { looksLikeKikuyu, UNSUPPORTED_LANGUAGE_REPLY } from "../languageGuard.ts";
import { COMPLIANCE_OVERHEAD_CHARS } from "../smsCompliance.ts";
import { buildOfflineReply, ENGLISH_WORDING, SWAHILI_WORDING } from "../smsReply.ts";
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

function replyWithDecision(match: AssistedMatch, language: AppLanguage): string {
  const catalog = language === "sw" ? DISEASES_IN_SWAHILI : DISEASES;
  const wording = language === "sw" ? SWAHILI_WORDING : ENGLISH_WORDING;
  if (match.kind !== "confident") return buildOfflineReply(match, catalog, wording);
  const card = buildActionCard({ kind: "sms", condition: match.best.key, confirmed: true }, { language });
  const line = decisionLine(card);
  const diagnosis = buildOfflineReply(match, catalog, wording, line.length + 1 + COMPLIANCE_OVERHEAD_CHARS);
  return `${diagnosis} ${line}`;
}

export async function answerWithLocalModel(model: LocalModel | null, message: string): Promise<LocalModelAnswer> {
  if (looksLikeKikuyu(message)) {
    return { reply: UNSUPPORTED_LANGUAGE_REPLY, report: unsure("message looks like Kikuyu"), match: { kind: "noMatch" } };
  }
  const report = model ? await parseFarmerMessage(model, message) : unsure("no on-device model loaded");
  const match = matchWithModelHelp(message, report, DISEASES);
  const reply = replyWithDecision(match, repliesInSwahili(report) ? "sw" : "en");
  return { reply, report, match };
}
