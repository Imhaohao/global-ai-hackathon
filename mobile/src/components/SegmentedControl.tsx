import { Pressable, Text, View } from 'react-native';

import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type SegmentOption<Value extends string> = { value: Value; label: string };

type SegmentedControlProps<Value extends string> = {
  label: string;
  options: SegmentOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
};

function Segment({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const focus = useControlFocus();
  const container = isSelected ? 'bg-surface shadow-sm' : 'active:bg-paper';
  const text = isSelected ? 'font-semibold text-ink' : 'font-medium text-ink-muted';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
      className={`min-h-11 flex-1 items-center justify-center rounded-full px-2 py-1 ${container}`}
    >
      <Text numberOfLines={2} className={`text-center text-base ${text}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SegmentedControl<Value extends string>({ label, options, value, onChange }: SegmentedControlProps<Value>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} className="flex-row gap-1 rounded-full bg-hairline p-1">
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          isSelected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}
