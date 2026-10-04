import { adviceTextFor } from "../../shared/src/adviceText.ts";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../../shared/src/languages.ts";

// ElevenLabs agents name Norwegian Bokmål "no".
const ELEVENLABS_CODES: Record<string, string> = { nb: "no" };

/**
 * ElevenLabs `language_presets`: the greeting the phone line opens with in each language it can switch to.
 * Its language detection only switches into languages listed here.
 */
export function voiceLanguagePresets(): Record<string, { overrides: { agent: { first_message: string } } }> {
  const spoken = LANGUAGES.filter((language) => language.phoneLine && language.code !== DEFAULT_LANGUAGE);
  return Object.fromEntries(
    spoken.map(({ code }) => [
      ELEVENLABS_CODES[code] ?? code,
      { overrides: { agent: { first_message: adviceTextFor(code).phoneGreeting } } },
    ]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(voiceLanguagePresets(), null, 2));
