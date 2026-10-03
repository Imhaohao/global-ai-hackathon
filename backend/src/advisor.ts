import Anthropic from "@anthropic-ai/sdk";
import { buildOfflineReply, DISEASES, fitToSms, matchSymptoms } from "../../shared/src/index.ts";
import type { DiseaseInfo } from "../../shared/src/index.ts";
import { ConversationStore } from "./conversationStore.ts";

export interface Advisor {
  advise(phone: string, question: string): Promise<string>;
}

const MODEL = "claude-opus-5-5";

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

export const SYSTEM_PROMPT = `You are Leaf Doctor, a coffee plant advisor that smallholder farmers reach by SMS or phone from basic phones. Many have little schooling and have never used AI.

Reply rules:
- Plain, short English a farmer can act on today. No jargon, no markdown, no emojis, no lists with symbols; number steps like "1)".
- Your whole reply must fit in 400 characters.
- If the description fits one condition below, name it and give the two or three most useful steps from its list.
- If it could be two conditions, ask ONE simple question that tells them apart (use the "How to tell apart" line).
- If it does not match any condition, say you are not sure and ask what colour the spots are, whether they are on top or underneath, and whether there is powder, rings, or tunnels.
- Only recommend actions from the lists below. For any chemical, tell them to ask their local extension officer. Never invent product names or doses.
- If the question is not about coffee plants, say you can only help with coffee leaves.

Conditions you know:

${Object.values(DISEASES).map(describeDisease).join("\n\n")}`;

function offlineAnswer(question: string): string {
  return buildOfflineReply(matchSymptoms(question, DISEASES), DISEASES);
}

function replyText(response: Anthropic.Beta.Messages.BetaMessage): string | null {
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join(" ")
    .trim();
  return text.length > 0 ? text : null;
}

export function createClaudeAdvisor(
  client: Anthropic = new Anthropic(),
  store: ConversationStore = new ConversationStore(),
): Advisor {
  return {
    async advise(phone, question) {
      try {
        const response = await client.beta.messages.create({
          model: MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "low" },
          cache_control: { type: "ephemeral" },
          system: SYSTEM_PROMPT,
          messages: [...store.history(phone), { role: "user", content: question }],
        });
        const answer = replyText(response);
        if (!answer) return offlineAnswer(question);
        const smsAnswer = fitToSms(answer);
        store.append(phone, question, smsAnswer);
        return smsAnswer;
      } catch (error) {
        console.error("Claude request failed, using offline matcher:", error);
        return offlineAnswer(question);
      }
    },
  };
}
