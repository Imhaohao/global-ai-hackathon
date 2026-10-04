import type { AppLanguage } from '../../../shared/src/contract.ts';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const LOCALE_BY_LANGUAGE: Record<AppLanguage, string> = { en: 'en-GB', sw: 'sw-KE' };

export function formatRecheckDate(capturedAt: string, recheckInDays: number, language: AppLanguage): string {
  const recheckDate = new Date(new Date(capturedAt).getTime() + recheckInDays * MILLISECONDS_PER_DAY);
  return recheckDate.toLocaleDateString(LOCALE_BY_LANGUAGE[language], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
