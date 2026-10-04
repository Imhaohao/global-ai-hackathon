import { Check, MinusCircle, WarningCircle, type Icon } from 'phosphor-react-native';
import { Image, View } from 'react-native';

import type { LeafReading, PlantVerdict } from '../../../shared/src/contract.ts';
import { fillTemplate, type Strings } from '../i18n/strings';
import { leafMarkOf, type LeafMark } from '../screens/leafMarks';
import { colors } from '../theme';
import { LeafIcon } from './leaf/Leaf';

const MARK_ICON: Record<LeafMark, Icon> = {
  agrees: Check,
  clear: Check,
  differs: MinusCircle,
  unusable: WarningCircle,
};

const MARK_STYLE: Record<LeafMark, { container: string; color: string }> = {
  agrees: { container: 'bg-healthy', color: colors['on-accent'] },
  clear: { container: 'bg-ink-muted', color: colors['on-accent'] },
  differs: { container: 'bg-watch', color: colors['on-accent'] },
  unusable: { container: 'bg-sick', color: colors['on-accent'] },
};

export function LeafMarkBadge({ mark, accessibilityLabel }: { mark: LeafMark; accessibilityLabel: string }) {
  const IconComponent = MARK_ICON[mark];
  return (
    <View
      accessible={false}
      accessibilityLabel={accessibilityLabel}
      className={`absolute bottom-1 right-1 h-6 w-6 items-center justify-center rounded-full ${MARK_STYLE[mark].container}`}
    >
      <IconComponent size={16} weight="bold" color={MARK_STYLE[mark].color} />
    </View>
  );
}

type LeafSlotsProps = {
  photoUris: string[];
  readings: LeafReading[];
  verdict: PlantVerdict | null;
  slotCount: number;
  accessibilityLabel: string;
  strings: Strings;
};

function markLabel(strings: Strings, number: number, mark: LeafMark): string {
  const key = {
    agrees: 'leafAgrees',
    clear: 'leafClear',
    differs: 'leafDiffers',
    unusable: 'leafUnusable',
  }[mark] as 'leafAgrees' | 'leafClear' | 'leafDiffers' | 'leafUnusable';
  return fillTemplate(strings[key], { number });
}

function slotLabel(
  strings: Strings,
  number: number,
  photoUri: string | undefined,
  reading: LeafReading | undefined,
  verdict: PlantVerdict | null,
): string {
  if (!photoUri) return fillTemplate(strings.leafEmpty, { number });
  if (!reading || !verdict) return fillTemplate(strings.leafTaken, { number });
  return markLabel(strings, number, leafMarkOf(reading, verdict));
}

export function LeafSlots({ photoUris, readings, verdict, slotCount, accessibilityLabel, strings }: LeafSlotsProps) {
  const slots = Array.from({ length: slotCount }, (_, index) => index);
  return (
    <View accessibilityLabel={accessibilityLabel} className="flex-row gap-2">
      {slots.map((index) => {
        const photoUri = photoUris[index];
        const reading = readings[index];
        const label = slotLabel(strings, index + 1, photoUri, reading, verdict);
        const mark = photoUri && reading && verdict ? leafMarkOf(reading, verdict) : null;
        return (
          <View
            key={index}
            accessible
            accessibilityRole="image"
            accessibilityLabel={label}
            className="aspect-square flex-1 items-center justify-center overflow-hidden rounded-control bg-hairline"
          >
            {photoUri ? (
              <Image
                source={{ uri: photoUri }}
                className="h-full w-full"
                accessibilityIgnoresInvertColors
                accessible={false}
              />
            ) : (
              <LeafIcon size={22} color={colors['ink-muted']} />
            )}
            {mark && <LeafMarkBadge mark={mark} accessibilityLabel={label} />}
          </View>
        );
      })}
    </View>
  );
}
