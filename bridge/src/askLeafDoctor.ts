import { buildOfflineReply, DEFAULT_BACKEND_URL, DISEASES, matchSymptoms } from "../../shared/src/index.ts";

export type AnswerSource = "online" | "offline";

const ONLINE_TIMEOUT_MS = 15_000;

function offlineAnswer(question: string): string {
  return buildOfflineReply(matchSymptoms(question, DISEASES), DISEASES);
}

async function askBackend(backendUrl: string, token: string, from: string, text: string): Promise<string> {
  const response = await fetch(`${backendUrl}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ from, text }),
    signal: AbortSignal.timeout(ONLINE_TIMEOUT_MS),
  });
  if (response.status !== 200) throw new Error(`Leaf Doctor server answered ${response.status}`);
  const payload = (await response.json()) as { reply?: unknown };
  if (typeof payload.reply !== "string" || !payload.reply.trim()) throw new Error("Malformed reply");
  return payload.reply;
}

export async function askLeafDoctor(
  from: string,
  question: string,
  token: string | undefined,
  backendUrl = DEFAULT_BACKEND_URL,
): Promise<{ reply: string; source: AnswerSource }> {
  if (!token) return { reply: offlineAnswer(question), source: "offline" };
  try {
    return { reply: await askBackend(backendUrl, token, from, question), source: "online" };
  } catch (error) {
    console.warn(`Answering offline: ${(error as Error).message}`);
    return { reply: offlineAnswer(question), source: "offline" };
  }
}
