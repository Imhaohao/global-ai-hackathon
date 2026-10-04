import { EyeSlash } from 'phosphor-react-native';
import { Pressable, Text, View } from 'react-native';

import type { DiseaseKey } from '../../../shared/src/index.ts';
import { CONTROL_FOCUS_STYLE, useControlFocus } from '../components/useControlFocus';
import { fillTemplate, type Strings } from '../i18n/strings';
import { colors } from '../theme';
import { DISEASE_COLORS } from './diseaseColors';
import type { DiseaseCount } from './useHotspotView';

type DiseaseFilterProps = {
  strings: Strings;
  counts: DiseaseCount[];
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
        backgroundColor: isHealthy ? colors.surface : DISEASE_COLORS[condition],
        borderWidth: isHealthy ? 3 : 0,
        borderColor: colors.healthy,
      }}
    />
  );
}

function DiseaseToggle({
  strings,
  condition,
  count,
  isShown,
  onToggle,
}: {
  strings: Strings;
  condition: DiseaseKey;
  count: number;
  isShown: boolean;
  onToggle: (condition: DiseaseKey) => void;
}) {
  const focus = useControlFocus();
  const container = isShown ? 'bg-surface shadow-sm active:bg-hairline' : 'bg-hairline active:bg-paper';
  const label = isShown ? 'text-ink' : 'text-ink-muted line-through';
  const name = strings.diseases[condition].name;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${name}, ${fillTemplate(strings.hotspotSightings, { count })}`}
      accessibilityState={{ checked: isShown }}
      onPress={() => onToggle(condition)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-11 max-w-full flex-row items-center gap-2 rounded-full py-2 pl-3 pr-4 ${container}`}
    >
      {isShown ? <ColorDot condition={condition} /> : <EyeSlash size={16} weight="bold" color={colors['ink-muted']} />}
      <Text className={`shrink text-base font-medium ${label}`}>{name}</Text>
      <Text className="text-base font-semibold text-ink-muted" style={{ fontVariant: ['tabular-nums'] }}>
        {count}
      </Text>
    </Pressable>
  );
}

export function DiseaseFilter({ strings, counts, selected, onToggle }: DiseaseFilterProps) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {counts.map(({ condition, count }) => (
        <DiseaseToggle
          key={condition}
          strings={strings}
          condition={condition}
          count={count}
          isShown={selected.has(condition)}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}
