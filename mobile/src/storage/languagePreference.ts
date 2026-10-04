import { File, Paths } from 'expo-file-system';

import { isLanguageCode, type LanguageCode } from '../../../shared/src/languages.ts';

// Kept per phone, not per account, so the sign-in screen already speaks the farmer's language.
const preferenceFile = () => new File(Paths.document, 'language.json');

export function loadLanguagePreference(): LanguageCode | null {
  try {
    const file = preferenceFile();
    if (!file.exists) return null;
    const saved: unknown = JSON.parse(file.textSync());
    const language = (saved as { language?: unknown } | null)?.language;
    return isLanguageCode(language) ? language : null;
  } catch {
    return null;
  }
}

export function saveLanguagePreference(language: LanguageCode): void {
  try {
    preferenceFile().write(JSON.stringify({ language }));
  } catch {
    // The choice still applies for this session; it is asked again next launch.
  }
}
