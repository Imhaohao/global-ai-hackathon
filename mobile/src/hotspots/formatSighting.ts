import type { AppLanguage } from '../../../shared/src/contract.ts';
import type { Sighting } from '../../../shared/src/hotspots.ts';
import { fillTemplate, type Strings } from '../i18n/strings';
import { localeFor } from '../screens/recheckDate';

const COORDINATE_DECIMALS = 5;

export function formatSightingTime(capturedAt: string, language: AppLanguage): string {
  return new Date(capturedAt).toLocaleString(localeFor(language), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatWeekStart(weekStart: string, language: AppLanguage): string {
  return new Date(weekStart).toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short' });
}

export function formatSightingPlace(sighting: Sighting, strings: Strings): string {
  const coordinates = {
    latitude: sighting.latitude.toFixed(COORDINATE_DECIMALS),
    longitude: sighting.longitude.toFixed(COORDINATE_DECIMALS),
  };
  if (sighting.accuracyMeters === undefined) return fillTemplate(strings.sightingPlaceUnknownAccuracy, coordinates);
  return fillTemplate(strings.sightingPlace, { ...coordinates, meters: Math.round(sighting.accuracyMeters) });
}
