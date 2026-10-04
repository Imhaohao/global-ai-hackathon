import assert from "node:assert/strict";
import test from "node:test";

import { ADVICE_TRANSLATIONS } from "../../shared/src/locales/index.ts";
import { adviceTextFor } from "../../shared/src/adviceText.ts";
import { languageInfo, type LanguageCode } from "../../shared/src/languages.ts";
import { UI_TRANSLATIONS } from "../../mobile/src/i18n/locales/index.ts";
import { SOURCE_TEXT } from "./sourceText.ts";
import { validateTranslation } from "./validateTranslation.ts";

const translated = Object.keys(ADVICE_TRANSLATIONS) as LanguageCode[];

test("every imported translation has both an app file and an advice file", () => {
  assert.deepEqual(Object.keys(UI_TRANSLATIONS).sort(), [...translated].sort());
  assert.ok(translated.length >= 90, `${translated.length} languages`);
});

for (const code of translated) {
  test(`${languageInfo(code).englishName} (${code}) still passes the checks it was imported with`, () => {
    const pack = { ui: UI_TRANSLATIONS[code]?.(), advice: ADVICE_TRANSLATIONS[code]?.() };
    const { rejections } = validateTranslation(SOURCE_TEXT, pack);
    assert.deepEqual(rejections, []);
    const english = adviceTextFor("en");
    const text = adviceTextFor(code);
    for (const key of Object.keys(english.diseases) as (keyof typeof english.diseases)[]) {
      assert.equal(text.diseases[key].actions.length, english.diseases[key].actions.length);
    }
  });
}
