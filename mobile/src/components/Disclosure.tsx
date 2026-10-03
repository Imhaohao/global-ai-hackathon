import { CaretDown, CaretUp } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme';

type DisclosureProps = { title: string; children: ReactNode };

export function Disclosure({ title, children }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const CaretIcon = isOpen ? CaretUp : CaretDown;
  return (
    <View className="rounded-control bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(!isOpen)}
        className="min-h-14 flex-row items-center justify-between gap-3 px-4 py-3"
      >
        <Text className="flex-1 text-lg font-semibold text-ink">{title}</Text>
        <CaretIcon size={22} weight="bold" color={colors['ink-muted']} />
      </Pressable>
      {isOpen && <View className="gap-3 px-4 pb-4">{children}</View>}
    </View>
  );
}
