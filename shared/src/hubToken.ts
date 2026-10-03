export type HubTokenCheck = "valid" | "rejected" | "unreachable";

const CHECK_TIMEOUT_MS = 8000;

function classifyStatus(status: number): HubTokenCheck {
  if (status === 204) return "valid";
  if (status === 401) return "rejected";
  return "unreachable";
}

export async function checkHubToken(backendUrl: string, token: string): Promise<HubTokenCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const response = await fetch(`${backendUrl}/hub/check`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    return classifyStatus(response.status);
  } catch {
    return "unreachable";
  } finally {
    clearTimeout(timer);
  }
}
