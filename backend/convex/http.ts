import { httpRouter } from "convex/server";
import { createApp } from "../src/app.ts";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { requireEnv } from "./sms";
import { createTwilioVerify } from "../src/twilioVerify.ts";

const http = httpRouter();

const handleWithApp = httpAction(async (ctx, request) => {
  const app = createApp({
    advisor: {
      advise: (phone, question) => ctx.runAction(internal.sms.answer, { from: phone, question }),
    },
    photoAdvisor: {
      advisePhoto: (phone, photo) =>
        ctx.runAction(internal.sms.answerPhoto, { from: phone, caption: photo.caption, base64: photo.base64, mediaType: photo.mediaType }),
    },
    queueSmsReply: async (from, question, media) => {
      await ctx.scheduler.runAfter(0, internal.sms.replyBySms, { from, question, mediaUrl: media?.url });
    },
    rateLimit: {
      allow: (sender, maxReplies) => ctx.runMutation(internal.phoneSessions.claimReplySlot, { phone: sender, maxReplies }),
    },
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    publicBaseUrl: requireEnv("CONVEX_SITE_URL"),
    hubToken: process.env.HUB_TOKEN ?? "",
    phoneAuth: {
      provider: createTwilioVerify({
        accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
        authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
        serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
      }),
      store: {
        claimAttempt: (phone, operation) => ctx.runMutation(internal.auth.claimAttempt, { phone, operation }),
        createSession: (phone, tokenHash, verificationSid, expiresAt) =>
          ctx.runMutation(internal.auth.createSession, { phone, tokenHash, verificationSid, expiresAt }),
        findSession: (tokenHash) => ctx.runQuery(internal.auth.findSession, { tokenHash }),
        revokeSession: async (tokenHash) => { await ctx.runMutation(internal.auth.revokeSession, { tokenHash }); },
      },
    },
  });
  return app.fetch(request);
});

for (const path of ["/health", "/privacy", "/terms", "/text-us", "/rain"]) {
  http.route({ path, method: "GET", handler: handleWithApp });
}
http.route({ path: "/sms", method: "POST", handler: handleWithApp });
http.route({ path: "/ask", method: "POST", handler: handleWithApp });
http.route({ path: "/ask-image", method: "POST", handler: handleWithApp });
http.route({ path: "/hub/check", method: "POST", handler: handleWithApp });
http.route({ path: "/auth/send-code", method: "POST", handler: handleWithApp });
http.route({ path: "/auth/verify-code", method: "POST", handler: handleWithApp });
http.route({ path: "/auth/session", method: "GET", handler: handleWithApp });
http.route({ path: "/auth/logout", method: "POST", handler: handleWithApp });

export default http;
