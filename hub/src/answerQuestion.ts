import { answerWithLocalModel } from "../../shared/src/localModel/index.ts";
import type { FarmerReport, LocalModel } from "../../shared/src/localModel/index.ts";

export type AnswerSource = "online" | "offline";

export interface Answer {
  reply: string;
  source: AnswerSource;
  modelReading: FarmerReport | null;
}

const ONLINE_TIMEOUT_MS = 8000;
export const DEFAULT_BACKEND_URL = "https://ideal-civet-53.convex.site";

function isReplyPayload(value: unknown): value is { reply: string } {
  if (typeof value !== "object" || value === null) return false;
  const reply = (value as { reply?: unknown }).reply;
  return typeof reply === "string" && reply.trim().length > 0;
}

async function askBackend(backendUrl: string, token: string, from: string, text: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ONLINE_TIMEOUT_MS);
  try {
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ from, text }),
      signal: controller.signal,
    });
    if (response.status !== 200) throw new Error(`Backend answered ${response.status}`);
    const payload: unknown = await response.json();
    if (!isReplyPayload(payload)) throw new Error("Backend reply was malformed");
    return payload.reply;
  } finally {
    clearTimeout(timer);
  }
}

async function answerOffline(text: string, localModel: LocalModel | null): Promise<Answer> {
  const { reply, report } = await answerWithLocalModel(localModel, text);
  return { reply, source: "offline", modelReading: report.status === "ok" ? report.value : null };
}

export async function answerQuestion(
  from: string,
  text: string,
  localModel: LocalModel | null,
  hubToken: string | null,
): Promise<Answer> {
  if (!hubToken) return answerOffline(text, localModel);
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;
  try {
    return { reply: await askBackend(backendUrl, hubToken, from, text), source: "online", modelReading: null };
  } catch {
    return answerOffline(text, localModel);
  }
}
