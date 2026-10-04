import { getLocales } from 'expo-localization';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEFAULT_LANGUAGE, suggestLanguages, type LanguageCode } from '../../../shared/src/languages.ts';
import {
  askForLocationPermission,
  readCurrentLocation,
  readLastKnownLocation,
  type DeviceLocation,
} from '../storage/deviceLocation';
import { APP_LANGUAGES } from './strings';

const OFFERED: ReadonlySet<LanguageCode> = new Set(APP_LANGUAGES);

export type LocationLookup = 'idle' | 'finding' | 'found' | 'failed';

/** Country under a position, worked out on the phone. The borders library is large, so it loads on first use. */
async function countryAt(location: DeviceLocation | null): Promise<string | null> {
  if (!location) return null;
  const { iso1A2Code } = await import('@rapideditor/country-coder');
  return iso1A2Code([location.longitude, location.latitude]);
}

function deviceSignals() {
  const locales = getLocales();
  return { deviceLanguages: locales, deviceRegion: locales[0]?.regionCode ?? null };
}

/** Languages to offer first, from the phone's settings and, when the farmer allows it, where the phone is. */
export function useLanguageSuggestions() {
  const [locationCountry, setLocationCountry] = useState<string | null>(null);
  const [lookup, setLookup] = useState<LocationLookup>('idle');

  useEffect(() => {
    let isCurrent = true;
    readLastKnownLocation()
      .then(countryAt)
      .then((country) => {
        if (!isCurrent || !country) return;
        setLocationCountry(country);
        setLookup('found');
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, []);

  const suggestFromLocation = useCallback(async () => {
    setLookup('finding');
    const granted = await askForLocationPermission();
    const country = granted ? await countryAt(await readCurrentLocation()).catch(() => null) : null;
    setLocationCountry(country);
    setLookup(country ? 'found' : 'failed');
  }, []);

  const suggestions: LanguageCode[] = useMemo(
    () => suggestLanguages({ locationCountry, ...deviceSignals() }, OFFERED),
    [locationCountry],
  );

  return { suggestions, lookup, suggestFromLocation };
}

/** The language to start in before the farmer has chosen one. */
export function firstGuessLanguage(): LanguageCode {
  return suggestLanguages(deviceSignals(), OFFERED)[0] ?? DEFAULT_LANGUAGE;
}
