import assert from "node:assert/strict";
import { test } from "node:test";

import { ENGLISH_COPY } from "./actionCard.en.ts";
import { ACTION_CARD_SW } from "./actionCard.sw.ts";
import { buildActionCard, RUST_SPRAY_ACTION_INDEX } from "./actionCard.ts";
import type { ActionCard, ActionContext, ActionInput, AppLanguage, PlantVerdict, WetDays } from "./contract.ts";
import { DISEASES } from "./diseases.ts";
import { DISEASES_SW } from "./diseases.sw.ts";
import type { DiseaseKey } from "./types.ts";

const LANGUAGES: AppLanguage[] = ["en", "sw"];

function answer(condition: DiseaseKey): PlantVerdict {
  return { kind: "answer", condition, agreeing: 4, usable: 5, total: 6 };
}

function plant(condition: DiseaseKey): ActionInput {
  return { kind: "plant", verdict: answer(condition) };
}

function wet(days: number): WetDays {
  return { wetDaysLast7: days, source: "NASA POWER", asOf: new Date().toISOString().slice(0, 10) };
}

function context(language: AppLanguage, wetDays?: WetDays): ActionContext {
  return { language, wetDays };
}

for (const language of LANGUAGES) {
  test(`healthy plant answer: monitor, no person, recheck in 14 days (${language})`, () => {
    const card = buildActionCard(plant("healthy"), context(language));
    assert.equal(card.decision, "monitor");
    assert.equal(card.needsPerson, false);
    assert.equal(card.recheckInDays, 14);
    assert.equal(card.urgency, "none");
    assert.equal(card.condition, "healthy");
    assert.equal(card.doNow[0], language === "sw" ? DISEASES_SW.rust.actions[0] : DISEASES.rust.actions[0]);
  });

  test(`rust below three wet days: prune and clean without the spray line (${language})`, () => {
    for (const wetDays of [undefined, wet(0), wet(2)]) {
      const card = buildActionCard(plant("rust"), context(language, wetDays));
      assert.equal(card.decision, "pruneAndClean");
      assert.equal(card.urgency, "high");
      assert.equal(card.recheckInDays, 7);
      assert.equal(card.needsPerson, false);
      assert.ok(!card.doNow.some((line) => /copper|shaba/i.test(line)));
    }
  });

  test(`rust at three wet days: upgraded to spray with the label rate and caveats (${language})`, () => {
    const card = buildActionCard(plant("rust"), context(language, wet(3)));
    assert.equal(card.decision, "spray");
    assert.equal(card.urgency, "high");
    assert.equal(card.recheckInDays, 7);
    const sprayStep = card.doNow.find((line) => /copper|shaba/i.test(line)) ?? "";
    assert.match(sprayStep, language === "sw" ? /haiponyi yaliyougua/ : /does not cure sick ones/);
    assert.match(sprayStep, language === "sw" ? /afisa ugani/ : /extension officer about timing/);
    assert.ok(sprayStep.endsWith(language === "sw" ? ACTION_CARD_SW.labelRate.text : ENGLISH_COPY.labelRate));
    assert.match(card.doNow[0], language === "sw" ? /siku 3 kati ya 7.*NASA POWER/ : /3 of the last 7 days.*NASA POWER/);
  });

  for (const condition of ["cercospora", "phoma"] as const) {
    test(`${condition}: prune and clean with the existing actions (${language})`, () => {
      const card = buildActionCard(plant(condition), context(language));
      assert.equal(card.decision, "pruneAndClean");
      assert.equal(card.needsPerson, false);
      assert.equal(card.recheckInDays, 14);
      assert.deepEqual(card.doNow, language === "sw" ? DISEASES_SW[condition].actions : DISEASES[condition].actions);
    });
  }

  test(`miner: monitor with the existing actions (${language})`, () => {
    const card = buildActionCard(plant("miner"), context(language));
    assert.equal(card.decision, "monitor");
    assert.equal(card.needsPerson, false);
    assert.equal(card.recheckInDays, 14);
    assert.deepEqual(card.doNow, language === "sw" ? DISEASES_SW.miner.actions : DISEASES.miner.actions);
  });

  for (const condition of ["weevil", "mites"] as const) {
    test(`${condition}: call the officer (${language})`, () => {
      const card = buildActionCard(plant(condition), context(language));
      assert.equal(card.decision, "callOfficer");
      assert.equal(card.needsPerson, true);
      assert.equal(card.condition, condition);
    });
  }

  test(`retake: monitor, no diagnosis, asks for clearer photos (${language})`, () => {
    const card = buildActionCard({ kind: "plant", verdict: { kind: "retake", usable: 1, total: 3 } }, context(language));
    assert.equal(card.decision, "monitor");
    assert.equal(card.needsPerson, false);
    assert.equal(card.condition, null);
    assert.equal(card.doNow.length, 3);
    assert.equal(card.headline, language === "sw" ? ACTION_CARD_SW.headlineRetake.text : ENGLISH_COPY.headlineRetake);
  });

  for (const reason of ["leavesDisagree", "tooFewClearLeaves"] as const) {
    test(`needsPerson ${reason}: call the officer and say the app is not sure (${language})`, () => {
      const verdict: PlantVerdict = { kind: "needsPerson", reason, usable: 4, total: 6 };
      const card = buildActionCard({ kind: "plant", verdict }, context(language));
      assert.equal(card.decision, "callOfficer");
      assert.equal(card.needsPerson, true);
      assert.equal(card.condition, null);
      assert.match(card.headline, language === "sw" ? /haina uhakika/ : /not sure/);
    });
  }

  test(`sms with no condition: call the officer (${language})`, () => {
    const card = buildActionCard({ kind: "sms", condition: null, confirmed: true }, context(language));
    assert.equal(card.decision, "callOfficer");
    assert.equal(card.needsPerson, true);
  });

  test(`sms not confirmed: call the officer and keep the suggestion (${language})`, () => {
    const card = buildActionCard({ kind: "sms", condition: "rust", confirmed: false }, context(language));
    assert.equal(card.decision, "callOfficer");
    assert.equal(card.needsPerson, true);
    assert.equal(card.condition, "rust");
    assert.ok(card.headline.includes(language === "sw" ? DISEASES_SW.rust.name : DISEASES.rust.name));
    assert.match(card.headline, /might be/);
  });

  test(`sms confirmed: same decision as the plant answer (${language})`, () => {
    for (const condition of ["healthy", "rust", "cercospora", "phoma", "miner", "weevil", "mites"] as const) {
      const fromSms = buildActionCard({ kind: "sms", condition, confirmed: true }, context(language, wet(3)));
      const fromPlant = buildActionCard(plant(condition), context(language, wet(3)));
      const decisionOf = ({ condition: c, decision, urgency, recheckInDays, needsPerson, sourceUrls, doNow }: ActionCard) =>
        ({ condition: c, decision, urgency, recheckInDays, needsPerson, sourceUrls, stepCount: doNow.length });
      assert.deepEqual(decisionOf(fromSms), decisionOf(fromPlant));
      if (language === "en") assert.deepEqual(fromSms, fromPlant);
    }
  });

  test(`every card lists the four problems the leaf model cannot see (${language})`, () => {
    const card = buildActionCard(plant("rust"), context(language));
    assert.equal(card.whatElseCouldItBe.length, 4);
    assert.equal(card.language, language);
    const cardWithoutAnswer = buildActionCard({ kind: "plant", verdict: { kind: "retake", usable: 0, total: 1 } }, context(language));
    assert.deepEqual(cardWithoutAnswer.whatElseCouldItBe, card.whatElseCouldItBe);
  });
}

test("source urls come from the disease entry", () => {
  assert.deepEqual(buildActionCard(plant("rust"), context("en")).sourceUrls, DISEASES.rust.sources);
  assert.deepEqual(buildActionCard({ kind: "sms", condition: null, confirmed: false }, context("en")).sourceUrls, []);
});

test("the app shows an unreviewed Swahili line", () => {
  assert.equal(ACTION_CARD_SW.headlineMonitor.reviewed, false);
  const card = buildActionCard(plant("miner"), context("sw"));
  assert.equal(card.headline, ACTION_CARD_SW.headlineMonitor.text.replace("{name}", DISEASES_SW.miner.name));
});

test("a text message keeps an unreviewed Swahili line in English and uses it once reviewed", () => {
  const sms: ActionInput = { kind: "sms", condition: "miner", confirmed: true };
  assert.equal(buildActionCard(sms, context("sw")).headline, ENGLISH_COPY.headlineMonitor.replace("{name}", DISEASES_SW.miner.name));

  const original = ACTION_CARD_SW.headlineMonitor;
  ACTION_CARD_SW.headlineMonitor = { ...original, reviewed: true };
  try {
    assert.equal(buildActionCard(sms, context("sw")).headline, original.text.replace("{name}", DISEASES_SW.miner.name));
  } finally {
    ACTION_CARD_SW.headlineMonitor = original;
  }
});

test("every new Swahili line is marked unreviewed", () => {
  assert.ok(Object.values(ACTION_CARD_SW).every((line) => !line.reviewed));
});

test("the rust spray index points at the copper line in both languages", () => {
  assert.match(DISEASES.rust.actions[RUST_SPRAY_ACTION_INDEX], /copper/);
  assert.match(DISEASES_SW.rust.actions[RUST_SPRAY_ACTION_INDEX], /shaba/);
});

test("the card never states a pesticide dose", () => {
  const card = buildActionCard(plant("rust"), context("en", wet(5)));
  assert.ok(!card.doNow.some((line) => /\b\d+\s?(ml|g|kg|l|litres?|grams?)\b/i.test(line)));
});

test("stale or future rain cannot upgrade rust advice even when a caller keeps it in memory", () => {
  const now = Date.now();
  for (const offset of [-4, 1]) {
    const wetDays = { ...wet(7), asOf: new Date(now + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) };
    const card = buildActionCard(plant("rust"), context("en", wetDays));
    assert.equal(card.decision, "pruneAndClean");
    assert.ok(!card.doNow.some((line) => /copper|NASA POWER/i.test(line)));
  }
});
