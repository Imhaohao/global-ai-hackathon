import { Check, type Icon } from 'phosphor-react-native';
import { Pressable, Text } from 'react-native';

import { colors } from '../theme';

type ChipProps = { label: string; onPress: () => void; selected?: boolean; icon?: Icon };

export function Chip({ label, onPress, selected = false, icon: IconComponent }: ChipProps) {
  const LeadingIcon = selected ? Check : IconComponent;
  const container = selected ? 'bg-accent active:bg-accent-pressed' : 'bg-surface active:bg-hairline';
  const textColor = selected ? 'text-on-accent' : 'text-ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-12 flex-row items-center gap-2 rounded-full px-5 py-2 shadow-sm ${container}`}
    >
      {LeadingIcon && <LeadingIcon size={20} weight="bold" color={selected ? colors['on-accent'] : colors.accent} />}
      <Text className={`text-base font-medium ${textColor}`}>{label}</Text>
    </Pressable>
  );
}
