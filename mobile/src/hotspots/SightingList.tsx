import { CaretDown, CaretUp } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import type { AppLanguage } from '../../../shared/src/contract.ts';
import type { Hotspot, Sighting } from '../../../shared/src/hotspots.ts';
import { Muted, SectionHeading } from '../components/Typography';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { ColorDot } from './DiseaseFilter';
import { formatSightingPlace, formatSightingTime } from './formatSighting';

type SightingListProps = { hotspot: Hotspot; strings: Strings; language: AppLanguage };

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Muted>{label}</Muted>
      <Text selectable className="text-lg text-ink">
        {value}
      </Text>
    </View>
  );
}

function LeafPhoto({ uri, strings }: { uri: string; strings: Strings }) {
  const [hasFailed, setHasFailed] = useState(false);
  if (hasFailed) {
    return (
      <View className="size-24 items-center justify-center rounded-control bg-hairline p-2">
        <Text className="text-center text-sm text-ink-muted">{strings.sightingPhotoMissing}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      accessibilityIgnoresInvertColors
      onError={() => setHasFailed(true)}
      className="size-24 rounded-control bg-hairline"
    />
  );
}

function SightingPhotos({ sighting, strings }: { sighting: Sighting; strings: Strings }) {
  if (sighting.photoUris.length === 0) return null;
  return (
    <View className="gap-2">
      <Muted>{strings.sightingPhotos}</Muted>
      <ScrollView horizontal contentContainerClassName="gap-2" showsHorizontalScrollIndicator={false}>
        {sighting.photoUris.map((uri) => (
          <LeafPhoto key={uri} uri={uri} strings={strings} />
        ))}
      </ScrollView>
    </View>
  );
}

function SightingRow({ sighting, strings, language }: { sighting: Sighting; strings: Strings; language: AppLanguage }) {
  const [isOpen, setIsOpen] = useState(false);
  const disease = strings.diseases[sighting.condition].name;
  const time = formatSightingTime(sighting.capturedAt, language);
  const CaretIcon = isOpen ? CaretUp : CaretDown;
  return (
    <View className="rounded-control bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={fillTemplate(strings.sightingShowDetails, { disease, time })}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(!isOpen)}
        className="min-h-16 flex-row items-center gap-3 rounded-control px-4 py-3 active:bg-hairline"
      >
        <View className="flex-1">
          <Text className="text-lg font-semibold text-ink">{time}</Text>
          {sighting.farmSection && <Muted>{sighting.farmSection}</Muted>}
        </View>
        <CaretIcon size={22} weight="bold" color={colors['ink-muted']} />
      </Pressable>
      {isOpen && (
        <View className="gap-4 px-4 pb-4">
          <DetailLine label={strings.sightingWhat} value={disease} />
          <DetailLine label={strings.sightingWhen} value={time} />
          <DetailLine label={strings.sightingWhere} value={formatSightingPlace(sighting, strings)} />
          {sighting.farmSection && <DetailLine label={strings.sightingFarmSection} value={sighting.farmSection} />}
          <SightingPhotos sighting={sighting} strings={strings} />
        </View>
      )}
    </View>
  );
}

export function SightingList({ hotspot, strings, language }: SightingListProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3">
        <ColorDot condition={hotspot.condition} size={20} />
        <View className="flex-1">
          <SectionHeading>{strings.diseases[hotspot.condition].name}</SectionHeading>
          <Muted>{fillTemplate(strings.hotspotSightings, { count: hotspot.sightings.length })}</Muted>
        </View>
      </View>
      {hotspot.sightings.map((sighting) => (
        <SightingRow key={sighting.observationId} sighting={sighting} strings={strings} language={language} />
      ))}
    </View>
  );
}
