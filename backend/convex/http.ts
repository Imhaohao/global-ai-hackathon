import { httpRouter } from "convex/server";
import { createApp } from "../src/app.ts";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { requireEnv } from "./sms";

const http = httpRouter();

const handleWithApp = httpAction(async (ctx, request) => {
  const app = createApp({
    advisor: {
      advise: (phone, question) => ctx.runAction(internal.sms.answer, { from: phone, question }),
    },
    queueSmsReply: async (from, question) => {
      await ctx.scheduler.runAfter(0, internal.sms.replyBySms, { from, question });
    },
    rateLimit: {
      allow: (sender) => ctx.runMutation(internal.phoneSessions.claimReplySlot, { phone: sender }),
    },
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    publicBaseUrl: requireEnv("CONVEX_SITE_URL"),
    hubToken: process.env.HUB_TOKEN ?? "",
  });
  return app.fetch(request);
});

for (const path of ["/health", "/privacy", "/terms", "/text-us"]) {
  http.route({ path, method: "GET", handler: handleWithApp });
}
http.route({ path: "/sms", method: "POST", handler: handleWithApp });
http.route({ path: "/ask", method: "POST", handler: handleWithApp });
http.route({ path: "/hub/check", method: "POST", handler: handleWithApp });

export default http;
