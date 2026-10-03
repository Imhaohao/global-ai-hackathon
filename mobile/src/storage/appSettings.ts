import type { Language } from '../i18n/strings';
import { readJson, writeJson } from './documentStore';

export type ConsentChoice = 'pending' | 'withLocation' | 'withoutLocation';

export type AppSettings = {
  consent: ConsentChoice;
  language?: Language;
  officerPhone?: string;
  farmSections: string[];
};

export const DEFAULT_SETTINGS: AppSettings = { consent: 'pending', farmSections: [] };

export function loadSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<AppSettings>>({}, 'settings.json') };
}

export function saveSettings(settings: AppSettings): void {
  writeJson(settings, 'settings.json');
}

export function locationAllowed(settings: AppSettings): boolean {
  return settings.consent === 'withLocation';
}
