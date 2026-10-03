// Builds every on-screen SMS and card string with the project's own formatter and rules, so the reel quotes
// the product instead of paraphrasing it. SHARED_DIR points at a shared/src that has the action card rules
// (branch part-2-rules); the default is this checkout's shared/src. SHARED_REF names that source in the output.
// Example: git archive part-2-rules shared | tar -x -C /tmp/p2 && SHARED_DIR=/tmp/p2/shared/src SHARED_REF="part-2-rules bb3a2f6" npm run copy
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sharedDir = resolve(process.env.SHARED_DIR ?? resolve(here, "../../shared/src"));
const shared = await import(resolve(sharedDir, "index.ts"));

const { FARMER_MESSAGE_CASES } = await import(resolve(sharedDir, "localModel/evalCases.ts"));
const noorMessage: string = FARMER_MESSAGE_CASES[1].message;

const rawMatch = shared.matchSymptoms(noorMessage, shared.DISEASES);
const modelAssistedMatch = { kind: "confirmFirst", best: { key: "rust", score: 1, matchedWords: [] } };
const hubReply = shared.buildOfflineReply(modelAssistedMatch, shared.DISEASES_IN_SWAHILI, shared.SWAHILI_WORDING);
const hubSms = shared.formatOutgoingSms(hubReply, true);
const hubSmsEnglish = shared.formatOutgoingSms(shared.buildOfflineReply(modelAssistedMatch, shared.DISEASES, shared.ENGLISH_WORDING), true);

const rustVerdict = { kind: "answer", condition: "rust", agreeing: 5, usable: 6, total: 6 };
const rustCard = shared.buildActionCard({ kind: "plant", verdict: rustVerdict }, { language: "en" });
const rustDecisionLine = shared.decisionLine(shared.buildActionCard({ kind: "sms", condition: "rust", confirmed: true }, { language: "sw" }));

const unsureVerdict = { kind: "needsPerson", reason: "leavesDisagree", usable: 5, total: 6 };
const unsureCard = shared.buildActionCard({ kind: "plant", verdict: unsureVerdict }, { language: "en" });
const caseSummary = shared.formatCaseSummarySms({
  observation: {
    id: "a7f3",
    capturedAt: "2026-10-04T09:12:00Z",
    farmSection: "upper slope",
    check: { readings: [], verdict: unsureVerdict, modelVersion: "252d268", checkedAt: "2026-10-04T09:12:00Z" },
    reviewStatus: "unreviewed",
  },
  card: unsureCard,
});

const copy = {
  generatedFrom: process.env.SHARED_REF ?? "shared/src in this checkout",
  noorMessage,
  rawMatchKind: rawMatch.kind,
  hubReply,
  hubSms,
  hubSmsEnglish,
  approvedSwahiliSamples: [
    shared.SWAHILI_WORDING.confirmFirst(shared.DISEASES_SW.rust.name, "").replace(/\s+/g, " ").trim(),
    shared.DISEASES_SW.rust.actions[1],
    shared.DISEASES_SW.cercospora.name,
    shared.DISEASES_SW.miner.actions[0],
  ],
  englishConfirmLine: shared.ENGLISH_WORDING.confirmFirst("", "").replace(/^This might be \. /, "").trim(),
  rustCard: {
    headline: rustCard.headline,
    urgency: rustCard.urgency,
    doNow: rustCard.doNow,
    recheckInDays: rustCard.recheckInDays,
    contactName: rustCard.contact.name,
    whatElseCouldItBe: rustCard.whatElseCouldItBe,
  },
  rustDecisionLine,
  unsureCard: { headline: unsureCard.headline, doNow: unsureCard.doNow },
  caseSummary,
  brandPrefix: `${shared.SENDER_NAME}: `,
  verifiedContacts: shared.verifiedContacts().map((contact: { name: string; phone: string }) => ({ name: contact.name, phone: contact.phone })),
};

const target = resolve(here, "../src/reels/demo/productCopy.json");
writeFileSync(target, `${JSON.stringify(copy, null, 2)}\n`);
console.log(JSON.stringify(copy, null, 2));
