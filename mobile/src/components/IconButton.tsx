import type { Icon } from 'phosphor-react-native';
import { Pressable, View } from 'react-native';

import { colors } from '../theme';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type IconButtonProps = {
  label: string;
  icon: Icon;
  onPress: () => void;
  disabled?: boolean;
  expanded?: boolean;
};

export function IconButton({ label, icon: IconComponent, onPress, disabled = false, expanded }: IconButtonProps) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, expanded }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`h-14 w-14 items-center justify-center rounded-control bg-surface active:bg-hairline ${focus.isFocused ? 'bg-healthy-soft' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <IconComponent size={28} weight="regular" color={colors.accent} />
      </View>
    </Pressable>
  );
}
