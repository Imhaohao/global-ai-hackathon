import type { Icon } from 'phosphor-react-native';
import { Pressable } from 'react-native';

import { colors } from '../theme';

type IconButtonProps = {
  label: string;
  icon: Icon;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
};

export function IconButton({ label, icon: IconComponent, onPress, disabled = false, expanded }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      className={`h-14 w-14 items-center justify-center rounded-control bg-surface active:bg-hairline ${disabled ? 'opacity-40' : ''}`}
    >
      <IconComponent size={28} weight="regular" color={colors.accent} />
    </Pressable>
  );
}
