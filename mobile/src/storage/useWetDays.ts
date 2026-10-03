import { useCallback, useEffect, useState } from 'react';

import type { WetDays } from '../../../shared/src/contract.ts';
import { loadFreshWetDays, refreshWetDays } from './rainCache';

export function useWetDays(locationConsented: boolean) {
  const [wetDays, setWetDays] = useState<WetDays | undefined>(loadFreshWetDays);

  useEffect(() => {
    if (!locationConsented) return;
    let cancelled = false;
    refreshWetDays().then((latest) => {
      if (!cancelled) setWetDays(latest);
    });
    return () => {
      cancelled = true;
    };
  }, [locationConsented]);

  const forgetWetDays = useCallback(() => setWetDays(undefined), []);

  return { wetDays, forgetWetDays };
}
