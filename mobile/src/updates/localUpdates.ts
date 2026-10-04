import type { ImageSourcePropType } from 'react-native';

import savedUpdates from '../../assets/updates/updates.json';

export type UpdateKind = 'weather' | 'pest' | 'disease' | 'market' | 'policy';

export type LocalUpdate = {
  id: string;
  kind: UpdateKind;
  headline: string;
  summary: string;
  source: string;
  sourceUrl: string;
  publishedOn: string;
  dateNote?: string;
  photo: { file: string; credit: string; pageUrl: string };
};

/** The day the notices in assets/updates were read from their sources; the app shows them offline. */
export const UPDATES_SAVED_ON = '2026-10-04';

// Metro packages only images named in a literal require, so each saved photo is listed here.
const PHOTOS: Record<string, ImageSourcePropType> = {
  'kcm-auction-close-new-coffee-year.jpg': require('../../assets/updates/kcm-auction-close-new-coffee-year.jpg'),
  'kmd-october-2026-monthly-forecast.jpg': require('../../assets/updates/kmd-october-2026-monthly-forecast.jpg'),
  'el-nino-fungal-disease-watch.jpg': require('../../assets/updates/el-nino-fungal-disease-watch.jpg'),
  'cri-new-coffee-variety.jpg': require('../../assets/updates/cri-new-coffee-variety.jpg'),
  'kmd-ond-2026-short-rains-outlook.jpg': require('../../assets/updates/kmd-ond-2026-short-rains-outlook.jpg'),
  'cri-copper-spray-before-rains.jpg': require('../../assets/updates/cri-copper-spray-before-rains.jpg'),
};

export const LOCAL_UPDATES: LocalUpdate[] = (savedUpdates as LocalUpdate[])
  .filter((update) => PHOTOS[update.photo.file] !== undefined)
  .sort((first, second) => second.publishedOn.localeCompare(first.publishedOn));

export function updatePhoto(update: LocalUpdate): ImageSourcePropType {
  return PHOTOS[update.photo.file];
}

export function formatUpdateDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
