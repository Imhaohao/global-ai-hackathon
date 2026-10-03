import { buildOfflineReply, DISEASES, matchSymptoms } from "../../shared/src/index.ts";

export type AnswerSource = "online" | "offline";

export interface Answer {
  reply: string;
  source: AnswerSource;
}

const ONLINE_TIMEOUT_MS = 8000;

function isReplyPayload(value: unknown): value is { reply: string } {
  if (typeof value !== "object" || value === null) return false;
  const reply = (value as { reply?: unknown }).reply;
  return typeof reply === "string" && reply.trim().length > 0;
}

async function askBackend(backendUrl: string, from: string, text: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ONLINE_TIMEOUT_MS);
  try {
    const response = await fetch(`${backendUrl}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_HUB_TOKEN}`,
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

function answerOffline(text: string): Answer {
  return { reply: buildOfflineReply(matchSymptoms(text, DISEASES), DISEASES), source: "offline" };
}

export async function answerQuestion(from: string, text: string): Promise<Answer> {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (!backendUrl) return answerOffline(text);
  try {
    return { reply: await askBackend(backendUrl, from, text), source: "online" };
  } catch {
    return answerOffline(text);
  }
}
