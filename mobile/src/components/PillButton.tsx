import type { Icon } from 'phosphor-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type PillButtonProps = { label: string; icon: Icon; onPress: () => void; disabled?: boolean };

export function PillButton({ label, icon: IconComponent, onPress, disabled = false }: PillButtonProps) {
  const focus = useControlFocus();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-12 max-w-full flex-row items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-sm active:bg-hairline ${focus.isFocused ? 'bg-healthy-soft' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <IconComponent size={20} color={colors.accent} />
      </View>
      <Text className="min-w-0 text-base font-medium text-ink" style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
