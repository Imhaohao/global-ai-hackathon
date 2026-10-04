import { CaretDown, CaretUp, type Icon } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../theme';

type DisclosureProps = { title: string; children: ReactNode; icon?: Icon };

export function Disclosure({ title, children, icon: IconComponent }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const CaretIcon = isOpen ? CaretUp : CaretDown;
  return (
    <View className="rounded-control bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(!isOpen)}
        className="min-h-16 flex-row items-center justify-between gap-3 px-5 py-4 active:bg-hairline rounded-control"
      >
        {IconComponent && <IconComponent size={28} weight="duotone" color={colors.accent} />}
        <Text className="flex-1 text-lg font-semibold text-ink">{title}</Text>
        <CaretIcon size={22} weight="bold" color={colors['ink-muted']} />
      </Pressable>
      {isOpen && <View className="gap-3 px-4 pb-4">{children}</View>}
    </View>
  );
}
