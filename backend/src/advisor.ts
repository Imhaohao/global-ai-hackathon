import Anthropic from "@anthropic-ai/sdk";
import {
  buildRuleBasedReply,
  COMPLIANCE_OVERHEAD_CHARS,
  DISEASES,
  seedCheckReplyFor,
} from "../../shared/src/index.ts";
import type { AppLanguage, DiseaseInfo } from "../../shared/src/index.ts";
import { matchWithModelHelp } from "../../shared/src/localModel/assistedMatch.ts";
import {
  FARMER_REPORT_SCHEMA,
  validateFarmerReport,
} from "../../shared/src/localModel/parseFarmerMessage.ts";
import type { FarmerReport } from "../../shared/src/localModel/parseFarmerMessage.ts";
import { firstJsonObject, unsure } from "../../shared/src/localModel/localModel.ts";
import type { TaskResult } from "../../shared/src/localModel/localModel.ts";
import type { ConversationHistory, Turn } from "./conversationStore.ts";

export interface Advisor {
  advise(phone: string, question: string): Promise<string>;
}

export const MODEL = "claude-sonnet-5-5";
export const ONLINE_PROCESSING_NOTICE = "Twilio, Convex and Anthropic process your messages and photos to write and deliver the answer. Processing locations are not yet verified.";

export function describeDisease(disease: DiseaseInfo): string {
  return [
    `## ${disease.name} (${disease.key})`,
    `Looks like: ${disease.look}`,
    disease.tellApart ? `How to tell apart: ${disease.tellApart}` : "",
    disease.conditions ? `Worse when: ${disease.conditions}` : "",
    `Urgency: ${disease.urgency}${disease.urgencyReason ? ` - ${disease.urgencyReason}` : ""}`,
    `What to do, cheapest and safest first:\n${disease.actions.map((action) => `- ${action}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const STYLE_RULES = `- Reply in the language the farmer wrote in, using everyday words a farmer there would use. If you cannot tell the language, reply in English. The condition notes below are in English; translate them. Describe the disease by what it looks like and keep its English name in brackets. Do not add local or regional disease names: the same local name can mean a different disease in another country.
- Plain, short sentences a farmer can act on today. No jargon, no markdown, no emojis, no lists with symbols; number steps like "1)".
- Your whole reply must fit in 400 characters. If you write in a non-Latin script such as Amharic, Hindi, Arabic, or Thai, it must fit in 190 characters, because those texts cost three times as much per SMS.
- Only recommend actions from the lists below. For any chemical, tell them to ask their local extension officer. Never invent product names or doses.`;

export const CONDITION_NOTES = `Conditions you know:

${Object.values(DISEASES).map(describeDisease).join("\n\n")}`;

export const SYSTEM_PROMPT = `You are Leaf Doctor's message-reading step. You receive one message from a coffee farmer. Do not write advice or a treatment recommendation.

Reply rules:
${STYLE_RULES}
- Return only JSON matching the schema supplied by the caller. Translate the farmer's leaf description into symptomsInEnglish without adding signs the farmer did not mention.

${CONDITION_NOTES}`;

export function parseAdvisorReport(text: string | null): TaskResult<FarmerReport> {
  if (!text) return unsure("advisor did not return a report");
  const json = firstJsonObject(text);
  if (!json) return unsure("advisor did not return JSON");
  try {
    return validateFarmerReport(JSON.parse(json));
  } catch {
    return unsure("advisor returned invalid JSON");
  }
}

function languageForReport(report: TaskResult<FarmerReport>): AppLanguage {
  return report.status === "ok" && (report.value.language === "sw" || report.value.language === "mixed") ? "sw" : "en";
}

function replyFromReport(question: string, report: TaskResult<FarmerReport>, isFirstOnlineReply: boolean): string {
  const match = matchWithModelHelp(question, report, DISEASES);
  const notice = isFirstOnlineReply ? ONLINE_PROCESSING_NOTICE : "";
  const reservedChars = COMPLIANCE_OVERHEAD_CHARS + (notice ? notice.length + 1 : 0);
  const policyReply = buildRuleBasedReply(match, languageForReport(report), reservedChars);
  return notice ? `${notice} ${policyReply}` : policyReply;
}

function offlineAnswer(question: string, isFirstOnlineReply: boolean): string {
  return replyFromReport(question, unsure("no online report"), isFirstOnlineReply);
}

export function replyText(response: Anthropic.Beta.Messages.BetaMessage): string | null {
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join(" ")
    .trim();
  return text.length > 0 ? text : null;
}

export function createClaudeAdvisor(createClient: () => Anthropic, store: ConversationHistory): Advisor {
  return {
    async advise(phone, question) {
      const seedCheckReply = seedCheckReplyFor(question);
      if (seedCheckReply) return seedCheckReply;
      let turns: Turn[] = [];
      try {
        turns = await store.history(phone);
        const response = await createClient().beta.messages.create({
          model: MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: {
            effort: "low",
            format: { type: "json_schema", schema: FARMER_REPORT_SCHEMA },
          },
          cache_control: { type: "ephemeral" },
          system: SYSTEM_PROMPT,
          messages: [...turns, { role: "user", content: question }],
        });
        const report = parseAdvisorReport(replyText(response));
        const smsAnswer = replyFromReport(question, report, turns.length === 0);
        await store.append(phone, question, smsAnswer);
        return smsAnswer;
      } catch (error) {
        console.error("Claude request failed, using offline matcher:", error);
        return offlineAnswer(question, turns.length === 0);
      }
    },
  };
}
