import { ArrowLeft, Flask } from 'phosphor-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import type { AppLanguage, Observation } from '../../../shared/src/contract.ts';
import type { DateRange } from '../../../shared/src/hotspots.ts';
import { DISEASE_KEYS } from '../../../shared/src/index.ts';
import { Chip } from '../components/Chip';
import { PillButton } from '../components/PillButton';
import { Body, Muted, SectionHeading, Title } from '../components/Typography';
import { DiseaseFilter } from '../hotspots/DiseaseFilter';
import { HotspotMap } from '../hotspots/HotspotMap';
import { SightingList } from '../hotspots/SightingList';
import { TrendChart } from '../hotspots/TrendChart';
import { simulatedObservations } from '../hotspots/simulatedObservations';
import { useHotspotView } from '../hotspots/useHotspotView';
import { fillTemplate, type Strings } from '../i18n/strings';

type HotspotMapScreenProps = {
  strings: Strings;
  language: AppLanguage;
  observations: Observation[];
  onBack: () => void;
};

const SCREEN_SIDE_SPACE = 40;
const RANGES: DateRange[] = ['week', 'month', 'season', 'all'];

function rangeLabel(strings: Strings, range: DateRange): string {
  const labels: Record<DateRange, string> = {
    week: strings.rangeWeek,
    month: strings.rangeMonth,
    season: strings.rangeSeason,
    all: strings.rangeAll,
  };
  return labels[range];
}

function RangeFilter({ strings, range, onChange }: { strings: Strings; range: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {RANGES.map((option) => (
        <Chip key={option} label={rangeLabel(strings, option)} selected={range === option} onPress={() => onChange(option)} />
      ))}
    </View>
  );
}

function OmittedChecks({
  strings,
  withoutLocation,
  withoutAnswer,
  repeatChecksMerged,
}: {
  strings: Strings;
  withoutLocation: number;
  withoutAnswer: number;
  repeatChecksMerged: number;
}) {
  return (
    <View className="gap-1">
      {withoutLocation > 0 && <Muted>{fillTemplate(strings.mapUnplaced, { count: withoutLocation })}</Muted>}
      {withoutAnswer > 0 && <Muted>{fillTemplate(strings.mapNoAnswer, { count: withoutAnswer })}</Muted>}
      {repeatChecksMerged > 0 && <Muted>{fillTemplate(strings.mapRepeatsMerged, { count: repeatChecksMerged })}</Muted>}
    </View>
  );
}

function EmptyMap({ strings }: { strings: Strings }) {
  return (
    <View className="gap-2 rounded-card bg-surface p-6 shadow-sm">
      <SectionHeading>{strings.mapEmptyTitle}</SectionHeading>
      <Muted>{strings.mapEmptyBody}</Muted>
    </View>
  );
}

export function HotspotMapScreen({ strings, language, observations, onBack }: HotspotMapScreenProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const preview = useMemo(() => simulatedObservations(), []);
  const mapWidth = useWindowDimensions().width - SCREEN_SIDE_SPACE;
  const view = useHotspotView(isPreviewing ? preview : observations, mapWidth);
  const shownCount = view.hotspots.reduce((sum, hotspot) => sum + hotspot.sightings.length, 0);
  const trendConditions = DISEASE_KEYS.filter((condition) => condition !== 'healthy' && view.conditions.has(condition));
  const canPreview = __DEV__ && observations.length === 0;

  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
      <View className="items-start">
        <PillButton label={strings.back} icon={ArrowLeft} onPress={onBack} />
      </View>
      <Title>{strings.mapTitle}</Title>
      {isPreviewing && <Body className="rounded-control bg-watch-soft p-4 text-watch">{strings.mapSimulatedBanner}</Body>}
      <RangeFilter strings={strings} range={view.range} onChange={view.setRange} />
      <DiseaseFilter strings={strings} selected={view.conditions} onToggle={view.toggleCondition} />
      {view.hotspots.length === 0 ? (
        <EmptyMap strings={strings} />
      ) : (
        <View className="gap-3">
          <Body>{fillTemplate(strings.mapSummary, { sightings: shownCount, places: view.hotspots.length })}</Body>
          <HotspotMap
            layout={view.layout}
            width={mapWidth}
            selectedId={view.selected?.id ?? null}
            strings={strings}
            onSelect={(hotspot) => view.select(hotspot.id)}
          />
          <Muted>{strings.mapBiggerCircle}</Muted>
          <Muted>{strings.mapNotChecked}</Muted>
        </View>
      )}
      {view.selected ? (
        <SightingList hotspot={view.selected} strings={strings} language={language} />
      ) : (
        view.hotspots.length > 0 && <Muted>{strings.mapTapCircle}</Muted>
      )}
      <View className="gap-3">
        <SectionHeading>{strings.trendTitle}</SectionHeading>
        <TrendChart weeks={view.trendWeeks} conditions={trendConditions} language={language} strings={strings} width={mapWidth} />
        <Muted>{strings.trendNote}</Muted>
      </View>
      <OmittedChecks strings={strings} {...view.summary} />
      {canPreview && (
        <View className="items-start">
          <PillButton
            label={isPreviewing ? strings.mapStopPreview : strings.mapPreviewSimulated}
            icon={Flask}
            onPress={() => setIsPreviewing(!isPreviewing)}
          />
        </View>
      )}
    </ScrollView>
  );
}
