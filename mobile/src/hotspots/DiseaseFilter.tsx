import { Check } from 'phosphor-react-native';
import { Pressable, Text, View } from 'react-native';

import { DISEASE_KEYS, type DiseaseKey } from '../../../shared/src/index.ts';
import type { Strings } from '../i18n/strings';
import { colors } from '../theme';
import { DISEASE_COLORS } from './diseaseColors';

type DiseaseFilterProps = {
  strings: Strings;
  selected: ReadonlySet<DiseaseKey>;
  onToggle: (condition: DiseaseKey) => void;
};

export function ColorDot({ condition, size = 16 }: { condition: DiseaseKey; size?: number }) {
  const isHealthy = condition === 'healthy';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isHealthy ? 'transparent' : DISEASE_COLORS[condition],
        borderWidth: isHealthy ? 2 : 0,
        borderColor: DISEASE_COLORS[condition],
      }}
    />
  );
}

function DiseaseChip({
  strings,
  condition,
  isSelected,
  onToggle,
}: {
  strings: Strings;
  condition: DiseaseKey;
  isSelected: boolean;
  onToggle: (condition: DiseaseKey) => void;
}) {
  const container = isSelected ? 'bg-botanical shadow-md' : 'bg-surface shadow-sm';
  const textColor = isSelected ? 'text-ink' : 'text-ink-muted';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={() => onToggle(condition)}
      className={`min-h-12 flex-row items-center gap-2 rounded-full px-4 py-2 active:bg-hairline ${container}`}
    >
      <ColorDot condition={condition} />
      <Text className={`text-base font-medium ${textColor}`}>{strings.diseases[condition].name}</Text>
      {isSelected && <Check size={18} weight="bold" color={colors.accent} />}
    </Pressable>
  );
}

export function DiseaseFilter({ strings, selected, onToggle }: DiseaseFilterProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {DISEASE_KEYS.map((condition) => (
        <DiseaseChip
          key={condition}
          strings={strings}
          condition={condition}
          isSelected={selected.has(condition)}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}
