import { Hono, type Context } from "hono";
import { officerPage } from "./officerPage.ts";

export type AlertChannel = "twilio" | "hub";

export interface HubAlertDelivery {
  id: string;
  phone: string;
  body: string;
}

export interface NeighbourAlertService {
  officerView(): Promise<unknown>;
  approve(alertId: string, text: string): Promise<{ recipientCount: number } | null>;
  dismiss(alertId: string): Promise<boolean>;
  claimHubDeliveries(): Promise<HubAlertDelivery[]>;
  finishHubDelivery(deliveryId: string, sent: boolean): Promise<boolean>;
  leave(phone: string, channel: AlertChannel): Promise<void>;
}

export type HubAuthCheck = (authorization: string | undefined) => { error: string; status: 401 | 503 } | null;

const ALREADY_DECIDED = "This alert was already sent or dismissed. Reload to see the latest.";

async function jsonBody(c: Context): Promise<Record<string, unknown>> {
  const body: unknown = await c.req.json().catch(() => null);
  return typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function createAlertRoutes(alerts: NeighbourAlertService, hubAuthFailure: HubAuthCheck): Hono {
  const routes = new Hono();

  const refuse = (c: Context) => {
    const failure = hubAuthFailure(c.req.header("Authorization"));
    return failure ? c.json({ error: failure.error }, failure.status) : null;
  };

  routes.get("/officer", (c) => c.html(officerPage));

  routes.get("/officer/alerts", async (c) => refuse(c) ?? c.json(await alerts.officerView()));

  routes.post("/officer/send", async (c) => {
    const refusal = refuse(c);
    if (refusal) return refusal;
    const { id, text } = await jsonBody(c);
    const alertId = nonEmptyString(id);
    const message = nonEmptyString(text);
    if (!alertId || !message) return c.json({ error: "Send JSON with id and a non-empty text" }, 400);
    const result = await alerts.approve(alertId, message);
    return result ? c.json(result) : c.json({ error: ALREADY_DECIDED }, 409);
  });

  routes.post("/officer/dismiss", async (c) => {
    const refusal = refuse(c);
    if (refusal) return refusal;
    const alertId = nonEmptyString((await jsonBody(c)).id);
    if (!alertId) return c.json({ error: "Send JSON with id" }, 400);
    return (await alerts.dismiss(alertId)) ? c.body(null, 204) : c.json({ error: ALREADY_DECIDED }, 409);
  });

  routes.post("/hub/alerts/claim", async (c) => refuse(c) ?? c.json({ deliveries: await alerts.claimHubDeliveries() }));

  routes.post("/hub/alerts/done", async (c) => {
    const refusal = refuse(c);
    if (refusal) return refusal;
    const { id, sent } = await jsonBody(c);
    const deliveryId = nonEmptyString(id);
    if (!deliveryId || typeof sent !== "boolean") return c.json({ error: "Send JSON with id and sent (true or false)" }, 400);
    return (await alerts.finishHubDelivery(deliveryId, sent)) ? c.body(null, 204) : c.json({ error: "No claimed delivery with that id" }, 404);
  });

  routes.post("/hub/alerts/leave", async (c) => {
    const refusal = refuse(c);
    if (refusal) return refusal;
    const from = nonEmptyString((await jsonBody(c)).from);
    if (!from) return c.json({ error: "Send JSON with from" }, 400);
    await alerts.leave(from, "hub");
    return c.body(null, 204);
  });

  return routes;
}
