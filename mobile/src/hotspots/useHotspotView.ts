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
  type Sighting,
} from '../../../shared/src/hotspots.ts';
import { DISEASE_KEYS, type DiseaseKey } from '../../../shared/src/index.ts';
import { MAP_PADDING } from './HotspotMap';

const TREND_WEEKS = 8;

export type DiseaseCount = { condition: DiseaseKey; count: number };

function countsByDisease(sightings: Sighting[]): DiseaseCount[] {
  return DISEASE_KEYS.map((condition) => ({
    condition,
    count: sightings.filter((sighting) => sighting.condition === condition).length,
  }))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => second.count - first.count);
}

export function useHotspotView(observations: Observation[], mapSize: { width: number; height: number }) {
  const [range, setRange] = useState<DateRange>('season');
  const [conditions, setConditions] = useState<ReadonlySet<DiseaseKey>>(new Set(DISEASE_KEYS));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = useMemo(() => new Date(), []);
  const summary = useMemo(() => sightingsFromObservations(observations), [observations]);

  const inRange = useMemo(
    () => filterSightings(summary.sightings, { conditions: new Set(DISEASE_KEYS), since: sinceFor(range, now) }),
    [summary.sightings, range, now],
  );
  const diseaseCounts = useMemo(() => countsByDisease(inRange), [inRange]);
  const visible = useMemo(() => inRange.filter((sighting) => conditions.has(sighting.condition)), [inRange, conditions]);
  const hotspots = useMemo(() => groupIntoHotspots(visible), [visible]);
  const layout = useMemo(
    () => layoutHotspots(hotspots, mapSize.width, mapSize.height, MAP_PADDING),
    [hotspots, mapSize.width, mapSize.height],
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
    sightingsInRange: inRange.length,
    diseaseCounts,
    conditions,
    toggleCondition,
    hotspots,
    layout,
    trendWeeks,
    selected,
    toggleSelected: (hotspotId: string) => setSelectedId((current) => (current === hotspotId ? null : hotspotId)),
  };
}
