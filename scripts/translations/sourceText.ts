import { ENGLISH_ADVICE_TEXT } from "../../shared/src/adviceText.ts";
import { ENGLISH_UI_TEXT } from "../../mobile/src/i18n/strings.ts";

/** The English text a translation file mirrors, key for key. */
export const SOURCE_TEXT = {
  ui: ENGLISH_UI_TEXT,
  advice: {
    copy: ENGLISH_ADVICE_TEXT.copy,
    diseases: ENGLISH_ADVICE_TEXT.diseases,
    seedCheck: ENGLISH_ADVICE_TEXT.seedCheck,
    phoneGreeting: ENGLISH_ADVICE_TEXT.phoneGreeting,
  },
};

export type SourceText = typeof SOURCE_TEXT;
