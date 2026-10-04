import { DEFAULT_BACKEND_URL } from "../../shared/src/index.ts";

export interface QueuedAlert {
  id: string;
  phone: string;
  body: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

function isQueuedAlert(value: unknown): value is QueuedAlert {
  if (typeof value !== "object" || value === null) return false;
  const { id, phone, body } = value as Record<string, unknown>;
  return typeof id === "string" && typeof phone === "string" && typeof body === "string" && body.trim().length > 0;
}

async function postToHub(path: string, token: string, body: unknown, backendUrl: string): Promise<Response> {
  const response = await fetch(`${backendUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Leaf Doctor server answered ${response.status} for ${path}`);
  return response;
}

export async function claimQueuedAlerts(token: string, backendUrl = DEFAULT_BACKEND_URL): Promise<QueuedAlert[]> {
  const payload = (await (await postToHub("/hub/alerts/claim", token, {}, backendUrl)).json()) as { deliveries?: unknown };
  return Array.isArray(payload.deliveries) ? payload.deliveries.filter(isQueuedAlert) : [];
}

export async function reportAlertDelivery(token: string, id: string, sent: boolean, backendUrl = DEFAULT_BACKEND_URL): Promise<void> {
  await postToHub("/hub/alerts/done", token, { id, sent }, backendUrl);
}

export async function leaveAreaAlerts(token: string, from: string, backendUrl = DEFAULT_BACKEND_URL): Promise<void> {
  await postToHub("/hub/alerts/leave", token, { from }, backendUrl);
}
