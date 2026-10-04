import type { AppLanguage } from '../../../shared/src/contract.ts';
import { languageInfo } from '../../../shared/src/languages.ts';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function localeFor(language: AppLanguage): string {
  return languageInfo(language).locale;
}

export function formatRecheckDate(capturedAt: string, recheckInDays: number, language: AppLanguage): string {
  const recheckDate = new Date(new Date(capturedAt).getTime() + recheckInDays * MILLISECONDS_PER_DAY);
  return recheckDate.toLocaleDateString(localeFor(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
