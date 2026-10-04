import { ArrowLeft, GlobeHemisphereEast, MapTrifold, X } from 'phosphor-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import type { AppLanguage, Observation } from '../../../shared/src/contract.ts';
import type { DateRange } from '../../../shared/src/hotspots.ts';
import { DISEASE_KEYS } from '../../../shared/src/index.ts';
import { PillButton } from '../components/PillButton';
import { SegmentedControl } from '../components/SegmentedControl';
import { Body, Muted, SectionHeading, Title } from '../components/Typography';
import { useMeasuredWidth } from '../components/useMeasuredWidth';
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

const MAP_ASPECT = 1.05;
const MAP_MIN_HEIGHT = 300;
const MAP_MAX_HEIGHT = 440;

function mapHeightFor(width: number): number {
  return Math.round(Math.min(Math.max(width * MAP_ASPECT, MAP_MIN_HEIGHT), MAP_MAX_HEIGHT));
}

function rangeOptions(strings: Strings): { value: DateRange; label: string }[] {
  return [
    { value: 'week', label: strings.rangeWeek },
    { value: 'month', label: strings.rangeMonth },
    { value: 'season', label: strings.rangeSeason },
    { value: 'all', label: strings.rangeAll },
  ];
}

function OverlayCard({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <View className="w-full max-w-sm gap-3 rounded-card bg-surface p-5 shadow-md">
      <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
        {title}
      </Text>
      {body && <Muted>{body}</Muted>}
      {children}
    </View>
  );
}

function MapOverlay({
  strings,
  hasSightings,
  sightingsInRange,
  onShowExample,
}: {
  strings: Strings;
  hasSightings: boolean;
  sightingsInRange: number;
  onShowExample: () => void;
}) {
  if (!hasSightings) {
    return (
      <OverlayCard title={strings.mapEmptyTitle} body={strings.mapEmptyBody}>
        <View className="items-start">
          <PillButton label={strings.mapShowExample} icon={MapTrifold} onPress={onShowExample} />
        </View>
      </OverlayCard>
    );
  }
  if (sightingsInRange === 0) return <OverlayCard title={strings.trendEmpty} />;
  return null;
}

function ExampleBanner({ strings, onStop }: { strings: Strings; onStop: () => void }) {
  return (
    <View className="gap-3 rounded-control bg-watch-soft p-4">
      <Body className="text-watch">{strings.mapSimulatedBanner}</Body>
      <View className="items-start">
        <PillButton label={strings.mapStopPreview} icon={X} onPress={onStop} />
      </View>
    </View>
  );
}

function SatelliteToggle({ strings, isShown, onToggle }: { strings: Strings; isShown: boolean; onToggle: () => void }) {
  return (
    <View className="gap-2">
      <View className="items-start">
        <PillButton
          label={isShown ? strings.mapHideSatellite : strings.mapShowSatellite}
          icon={GlobeHemisphereEast}
          onPress={onToggle}
        />
      </View>
      {!isShown && <Muted>{strings.mapSatelliteNote}</Muted>}
    </View>
  );
}

type HotspotView = ReturnType<typeof useHotspotView>;

function Footnotes({ strings, summary }: { strings: Strings; summary: HotspotView['summary'] }) {
  const notes = [
    strings.mapNotChecked,
    summary.withoutLocation > 0 && fillTemplate(strings.mapUnplaced, { count: summary.withoutLocation }),
    summary.withoutAnswer > 0 && fillTemplate(strings.mapNoAnswer, { count: summary.withoutAnswer }),
    summary.repeatChecksMerged > 0 && fillTemplate(strings.mapRepeatsMerged, { count: summary.repeatChecksMerged }),
  ].filter((note): note is string => typeof note === 'string');
  return (
    <View className="gap-2">
      {notes.map((note) => (
        <Muted key={note}>{note}</Muted>
      ))}
    </View>
  );
}

function SelectionDetails({ view, strings, language }: { view: HotspotView; strings: Strings; language: AppLanguage }) {
  if (view.selected) return <SightingList hotspot={view.selected} strings={strings} language={language} />;
  if (view.hotspots.length === 0) return null;
  return <Muted>{strings.mapTapCircle}</Muted>;
}

function WeeklyTrend({ view, strings, language, width }: { view: HotspotView; strings: Strings; language: AppLanguage; width: number }) {
  const trendConditions = DISEASE_KEYS.filter((condition) => condition !== 'healthy' && view.conditions.has(condition));
  return (
    <View className="gap-3">
      <SectionHeading>{strings.trendTitle}</SectionHeading>
      <TrendChart weeks={view.trendWeeks} conditions={trendConditions} language={language} strings={strings} width={width} />
      <Muted>{strings.trendNote}</Muted>
    </View>
  );
}

function mapStringsFor(strings: Strings, view: HotspotView): Strings {
  const shownCount = view.hotspots.reduce((sum, hotspot) => sum + hotspot.sightings.length, 0);
  const summary = fillTemplate(strings.mapSummary, { sightings: shownCount, places: view.hotspots.length });
  return { ...strings, mapMapDescription: `${strings.mapMapDescription} ${summary}` };
}

function MapSection({
  view,
  strings,
  language,
  mapSize,
  isPreviewing,
  onPreviewChange,
}: {
  view: HotspotView;
  strings: Strings;
  language: AppLanguage;
  mapSize: { width: number; height: number };
  isPreviewing: boolean;
  onPreviewChange: (isPreviewing: boolean) => void;
}) {
  const [wantsSatellite, setWantsSatellite] = useState(false);
  const hasSightings = view.summary.sightings.length > 0;
  return (
    <>
      {isPreviewing && <ExampleBanner strings={strings} onStop={() => onPreviewChange(false)} />}
      <SegmentedControl label={strings.mapPeriod} options={rangeOptions(strings)} value={view.range} onChange={view.setRange} />
      {mapSize.width > 0 && (
        <HotspotMap
          layout={view.layout}
          width={mapSize.width}
          height={mapSize.height}
          selectedId={view.selected?.id ?? null}
          showsSatellite={isPreviewing || wantsSatellite}
          strings={mapStringsFor(strings, view)}
          onSelect={(hotspot) => view.toggleSelected(hotspot.id)}
        >
          <MapOverlay
            strings={strings}
            hasSightings={hasSightings}
            sightingsInRange={view.sightingsInRange}
            onShowExample={() => onPreviewChange(true)}
          />
        </HotspotMap>
      )}
      <SelectionDetails view={view} strings={strings} language={language} />
      <DiseaseFilter strings={strings} counts={view.diseaseCounts} selected={view.conditions} onToggle={view.toggleCondition} />
      {hasSightings && !isPreviewing && (
        <SatelliteToggle strings={strings} isShown={wantsSatellite} onToggle={() => setWantsSatellite(!wantsSatellite)} />
      )}
    </>
  );
}

export function HotspotMapScreen({ strings, language, observations, onBack }: HotspotMapScreenProps) {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const preview = useMemo(() => simulatedObservations(), []);
  const { width, onLayout } = useMeasuredWidth();
  const mapSize = { width, height: mapHeightFor(width) };
  const view = useHotspotView(isPreviewing ? preview : observations, mapSize);
  const showsTrend = view.summary.sightings.length > 0 && width > 0;

  return (
    <ScrollView contentContainerClassName="gap-6 px-5 pb-8 pt-2">
      <View className="items-start">
        <PillButton label={strings.back} icon={ArrowLeft} onPress={onBack} />
      </View>
      <Title>{strings.mapTitle}</Title>
      <View onLayout={onLayout} className="gap-4">
        <MapSection
          view={view}
          strings={strings}
          language={language}
          mapSize={mapSize}
          isPreviewing={isPreviewing}
          onPreviewChange={setIsPreviewing}
        />
      </View>
      {showsTrend && <WeeklyTrend view={view} strings={strings} language={language} width={width} />}
      <Footnotes strings={strings} summary={view.summary} />
    </ScrollView>
  );
}
