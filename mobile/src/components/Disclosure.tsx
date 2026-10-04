import { CaretDown, CaretUp, type Icon } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme';
import { CONTROL_FOCUS_STYLE, useControlFocus } from './useControlFocus';

type DisclosureProps = { title: string; children: ReactNode; icon?: Icon };

export function Disclosure({ title, children, icon: IconComponent }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const focus = useControlFocus();
  const CaretIcon = isOpen ? CaretUp : CaretDown;
  return (
    <View className="rounded-control bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(!isOpen)}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={focus.isFocused ? CONTROL_FOCUS_STYLE : undefined}
        className={`min-h-16 flex-row items-center justify-between gap-3 rounded-control px-5 py-4 active:bg-hairline ${focus.isFocused ? 'bg-healthy-soft' : ''}`}
      >
        {IconComponent && (
          <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <IconComponent size={28} weight="duotone" color={colors.accent} />
          </View>
        )}
        <Text className="flex-1 text-lg font-semibold text-ink">{title}</Text>
        <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <CaretIcon size={22} weight="bold" color={colors['ink-muted']} />
        </View>
      </Pressable>
      {isOpen && <View className="gap-3 px-4 pb-4">{children}</View>}
    </View>
  );
}
