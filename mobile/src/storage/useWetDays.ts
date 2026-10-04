import { useCallback, useEffect, useState } from 'react';

import type { WetDays } from '../../../shared/src/contract.ts';
import { getActiveAccountContext, isActiveAccountContext } from './documentStore';
import { loadFreshWetDays, refreshWetDays } from './rainCache';

export function useWetDays(locationConsented: boolean) {
  const [account] = useState(getActiveAccountContext);
  const [wetDays, setWetDays] = useState<WetDays | undefined>(loadFreshWetDays);

  useEffect(() => {
    if (!locationConsented) return;
    let cancelled = false;
    refreshWetDays(() => !cancelled && isActiveAccountContext(account)).then((latest) => {
      if (!cancelled) setWetDays(latest);
    });
    return () => {
      cancelled = true;
    };
  }, [account, locationConsented]);

  const forgetWetDays = useCallback(() => setWetDays(undefined), []);

  return { wetDays, forgetWetDays };
}
