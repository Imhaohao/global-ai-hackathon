import { Check, type Icon } from 'phosphor-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type ChipProps = { label: string; onPress: () => void; selected?: boolean; icon?: Icon; disabled?: boolean };

export function Chip({ label, onPress, selected = false, icon: IconComponent, disabled = false }: ChipProps) {
  const focus = useControlFocus();
  const LeadingIcon = selected ? Check : IconComponent;
  const container = selected ? 'bg-accent active:bg-accent-pressed' : 'bg-surface active:bg-hairline';
  const focusContainer = selected ? 'bg-accent-pressed' : 'bg-healthy-soft';
  const textColor = selected ? 'text-on-accent' : 'text-ink';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-12 flex-row items-center gap-2 rounded-full px-5 py-2 shadow-sm ${container} ${focus.isFocused ? focusContainer : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      {LeadingIcon && (
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <LeadingIcon size={20} weight="bold" color={selected ? colors['on-accent'] : colors.accent} />
        </View>
      )}
      <Text className={`text-base font-medium ${textColor}`}>{label}</Text>
    </Pressable>
  );
}
