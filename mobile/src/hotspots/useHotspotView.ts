import { useCallback, useMemo, useState } from 'react';

import type { Observation } from '../../../shared/src/contract.ts';
import {
  filterSightings,
  groupIntoHotspots,
  layoutHotspots,
  sightingsFromObservations,
  sinceFor,
  weeklyTrend,
  type DateRange,
} from '../../../shared/src/hotspots.ts';
import { DISEASE_KEYS, type DiseaseKey } from '../../../shared/src/index.ts';
import { MAP_HEIGHT, MAP_PADDING } from './HotspotMap';

const TREND_WEEKS = 8;

export function useHotspotView(observations: Observation[], mapWidth: number) {
  const [range, setRange] = useState<DateRange>('season');
  const [conditions, setConditions] = useState<ReadonlySet<DiseaseKey>>(new Set(DISEASE_KEYS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => sightingsFromObservations(observations), [observations]);

  const visible = useMemo(
    () => filterSightings(summary.sightings, { conditions, since: sinceFor(range, now) }),
    [summary.sightings, conditions, range, now],
  );
  const hotspots = useMemo(() => groupIntoHotspots(visible), [visible]);
  const layout = useMemo(
    () => layoutHotspots(hotspots, mapWidth, MAP_HEIGHT, MAP_PADDING),
    [hotspots, mapWidth],
  );
  const trendWeeks = useMemo(
    () => weeklyTrend(filterSightings(summary.sightings, { conditions, since: null }), now, TREND_WEEKS),
    [summary.sightings, conditions, now],
  );

  const toggleCondition = useCallback((condition: DiseaseKey) => {
    setConditions((current) => {
      const next = new Set(current);
      if (next.has(condition)) next.delete(condition);
      else next.add(condition);
      return next;
    });
  }, []);

  const selected = hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  return {
    summary,
    range,
    setRange,
    conditions,
    toggleCondition,
    hotspots,
    layout,
    trendWeeks,
    selected,
    select: (hotspotId: string | null) => setSelectedId(hotspotId),
  };
}
