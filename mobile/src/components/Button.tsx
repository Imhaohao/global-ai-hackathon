import type { Icon } from 'phosphor-react-native';
import { Pressable, Text } from 'react-native';

import { colors } from '../theme';

type Variant = 'primary' | 'secondary' | 'quiet';

const CONTAINER_BY_VARIANT: Record<Variant, string> = {
  primary: 'min-h-16 bg-accent active:bg-accent-pressed',
  secondary: 'min-h-16 bg-surface active:bg-hairline shadow-sm',
  quiet: 'min-h-14 active:bg-hairline',
};

const LABEL_BY_VARIANT: Record<Variant, string> = {
  primary: 'text-on-accent',
  secondary: 'text-ink',
  quiet: 'text-ink',
};

const ICON_COLOR_BY_VARIANT: Record<Variant, string> = {
  primary: colors['on-accent'],
  secondary: colors.accent,
  quiet: colors.accent,
};

type ButtonProps = {
  label: string;
  icon: Icon;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
};

export function Button({ label, icon: IconComponent, onPress, variant = 'primary', disabled = false }: ButtonProps) {
  return (
    <Pressable
      key={variant}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-14 max-w-full flex-row items-center justify-center gap-3 rounded-control px-6 py-4 ${CONTAINER_BY_VARIANT[variant]} ${disabled ? 'opacity-40' : ''}`}
    >
      <IconComponent size={26} weight="bold" color={ICON_COLOR_BY_VARIANT[variant]} />
      <Text className={`min-w-0 text-center text-lg font-semibold ${LABEL_BY_VARIANT[variant]}`} style={{ flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}
