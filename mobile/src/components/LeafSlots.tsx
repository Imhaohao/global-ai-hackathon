import { Check, Leaf, MinusCircle, WarningCircle, type Icon } from 'phosphor-react-native';
import { Image, View } from 'react-native';

import type { LeafReading, PlantVerdict } from '../../../shared/src/contract.ts';
import { leafMarkOf, type LeafMark } from '../screens/leafMarks';
import { colors } from '../theme';

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

export function LeafMarkBadge({ mark }: { mark: LeafMark }) {
  const IconComponent = MARK_ICON[mark];
  return (
    <View className={`absolute bottom-1 right-1 h-6 w-6 items-center justify-center rounded-full ${MARK_STYLE[mark].container}`}>
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
};

export function LeafSlots({ photoUris, readings, verdict, slotCount, accessibilityLabel }: LeafSlotsProps) {
  const slots = Array.from({ length: slotCount }, (_, index) => index);
  return (
    <View accessible accessibilityLabel={accessibilityLabel} className="flex-row gap-2">
      {slots.map((index) => {
        const photoUri = photoUris[index];
        const reading = readings[index];
        return (
          <View key={index} className="aspect-square flex-1 items-center justify-center overflow-hidden rounded-control bg-hairline">
            {photoUri ? (
              <Image source={{ uri: photoUri }} className="h-full w-full" accessibilityIgnoresInvertColors />
            ) : (
              <Leaf size={22} weight="duotone" color={colors['ink-muted']} />
            )}
            {photoUri && reading && verdict && <LeafMarkBadge mark={leafMarkOf(reading, verdict)} />}
          </View>
        );
      })}
    </View>
  );
}
