import type { Icon } from 'phosphor-react-native';
import { Pressable, Text } from 'react-native';

import { colors } from '../theme';

type PillButtonProps = { label: string; icon: Icon; onPress: () => void };

export function PillButton({ label, icon: IconComponent, onPress }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-11 flex-row items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-sm"
    >
      <IconComponent size={20} color={colors.accent} />
      <Text className="text-base font-medium text-ink">{label}</Text>
    </Pressable>
  );
}
