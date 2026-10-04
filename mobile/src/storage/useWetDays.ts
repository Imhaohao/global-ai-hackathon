import { useCallback, useEffect, useRef, useState } from 'react';

import type { WetDays } from '../../../shared/src/contract.ts';
import {
  getActiveAccountContext,
  getActiveAccountDataRevision,
  isActiveAccountContext,
} from './documentStore';
import { isCurrentDataOperation, type OperationStamp } from './operationRevision';
import { clearCachedWetDays, loadFreshWetDays, refreshWetDays } from './rainCache';

export function useWetDays(locationConsented: boolean) {
  const [account] = useState(getActiveAccountContext);
  const generation = useRef(0);
  const [isVisible, setIsVisible] = useState(locationConsented);
  const [wetDays, setWetDays] = useState<WetDays | undefined>(() =>
    locationConsented ? loadFreshWetDays() : undefined,
  );

  useEffect(() => {
    const requestGeneration = ++generation.current;
    const dataRevision = getActiveAccountDataRevision();
    const operation: OperationStamp = { generation: requestGeneration, dataRevision };
    let cancelled = false;
    if (!locationConsented) {
      clearCachedWetDays();
      void Promise.resolve().then(() => {
        if (!cancelled && requestGeneration === generation.current) {
          setIsVisible(false);
          setWetDays(undefined);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    void refreshWetDays(
      () =>
        isCurrentDataOperation(
          operation,
          generation.current,
          getActiveAccountDataRevision(),
          !cancelled && isActiveAccountContext(account),
        ),
    )
      .then((latest) => {
        if (
          isCurrentDataOperation(
            operation,
            generation.current,
            getActiveAccountDataRevision(),
            !cancelled && isActiveAccountContext(account),
          )
        ) {
          setIsVisible(true);
          setWetDays(latest);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [account, locationConsented]);

  const forgetWetDays = useCallback(() => {
    generation.current += 1;
    clearCachedWetDays();
    setIsVisible(false);
    setWetDays(undefined);
  }, []);

  return {
    wetDays: locationConsented && isVisible ? wetDays : undefined,
    forgetWetDays,
  };
}
