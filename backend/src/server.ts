import { serve } from "@hono/node-server";
import twilio from "twilio";
import { createClaudeAdvisor } from "./advisor.ts";
import { createApp } from "./app.ts";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Copy backend/.env.example to backend/.env and fill it in.`);
  return value;
}

function main() {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const fromNumber = requireEnv("TWILIO_PHONE_NUMBER");
  const twilioClient = twilio(accountSid, authToken);

  const app = createApp({
    advisor: createClaudeAdvisor(),
    sendSms: async (to, body) => {
      await twilioClient.messages.create({ to, from: fromNumber, body });
    },
    twilioAuthToken: authToken,
    publicBaseUrl: requireEnv("PUBLIC_BASE_URL"),
    hubToken: requireEnv("HUB_TOKEN"),
  });

  const port = Number(process.env.PORT ?? 8787);
  serve({ fetch: app.fetch, port }, () => console.log(`Leaf Doctor backend on http://localhost:${port}`));
}

main();
