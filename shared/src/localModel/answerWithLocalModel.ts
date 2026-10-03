import { DISEASES } from "../diseases.ts";
import { DISEASES_IN_SWAHILI } from "../diseases.sw.ts";
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

export async function answerWithLocalModel(model: LocalModel | null, message: string): Promise<LocalModelAnswer> {
  const report = model ? await parseFarmerMessage(model, message) : unsure("no on-device model loaded");
  const match = matchWithModelHelp(message, report, DISEASES);
  const reply = repliesInSwahili(report)
    ? buildOfflineReply(match, DISEASES_IN_SWAHILI, SWAHILI_WORDING)
    : buildOfflineReply(match, DISEASES, ENGLISH_WORDING);
  return { reply, report, match };
}
