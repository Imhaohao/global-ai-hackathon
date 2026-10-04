import assert from "node:assert/strict";
import test from "node:test";

import { validateTranslation } from "./validateTranslation.ts";

const english = {
  title: "Check a coffee leaf",
  count: "{count} of {max} leaves taken",
  dose: "Spray while under about 5 percent of leaves are sick.",
  brand: "Leaf Doctor",
  severity: { healthy: "Healthy", sick: "Act soon" },
  actions: ["Prune.", "Feed the trees."],
};

test("a faithful translation is kept whole", () => {
  const translated = {
    title: "Kagua jani la kahawa",
    count: "Majani {count} kati ya {max}",
    dose: "Nyunyizia majani yaliyougua yakiwa chini ya asilimia 5.",
    brand: "Leaf Doctor",
    severity: { healthy: "Mzima", sick: "Chukua hatua" },
    actions: ["Pogoa.", "Lisha miti."],
  };
  const result = validateTranslation(english, translated);
  assert.deepEqual(result.kept, translated);
  assert.deepEqual(result.rejections, []);
  assert.deepEqual(result.missing, []);
  assert.equal(result.untranslatedLines, 0);
});

test("lines that drop a placeholder, change a number or rename the brand fall back to English", () => {
  const result = validateTranslation(english, {
    title: "Kagua",
    count: "Majani {count}",
    dose: "Nyunyizia chini ya asilimia 50.",
    brand: "Daktari wa Jani",
    severity: { healthy: "Mzima", sick: "" },
    actions: ["Pogoa."],
  });
  assert.deepEqual(result.kept, { title: "Kagua", severity: { healthy: "Mzima" } });
  assert.deepEqual(
    result.rejections.map((rejection) => rejection.path),
    ["count", "dose", "brand", "severity.sick", "actions"],
  );
});

test("missing lines are reported and unknown keys are dropped", () => {
  const result = validateTranslation(english, { title: "Kagua", extra: "x" });
  assert.deepEqual(result.kept, { title: "Kagua" });
  assert.deepEqual(result.missing, ["count", "dose", "brand", "severity", "actions"]);
  assert.deepEqual(result.rejections, [{ path: "extra", reason: "not in the English source" }]);
  assert.equal(result.untranslatedLines, 7);
});

test("an empty translation leaves every line in English", () => {
  assert.equal(validateTranslation(english, {}).untranslatedLines, 8);
});

test("one bad step keeps the whole list in English, because steps are matched by position", () => {
  const result = validateTranslation({ actions: ["Spray 5 percent.", "Prune."] }, { actions: ["Nyunyizia asilimia 6.", "Pogoa."] });
  assert.deepEqual(result.kept, {});
  assert.equal(result.rejections[0].path, "actions[0]");
});
