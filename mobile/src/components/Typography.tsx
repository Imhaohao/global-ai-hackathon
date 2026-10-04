import { useRef, type ReactNode } from 'react';
import { Text } from 'react-native';

import { moveScreenReaderFocus } from './screenReaderFocus';

type TextProps = { children: ReactNode; className?: string };

export function Title({ children, className = '' }: TextProps) {
  const titleRef = useRef<Text | null>(null);
  const hasFocusedTitle = useRef(false);

  function focusTitleOnInitialLayout() {
    const title = titleRef.current;
    if (hasFocusedTitle.current || title === null) return;
    hasFocusedTitle.current = true;
    moveScreenReaderFocus(title);
  }

  return (
    <Text
      ref={titleRef}
      accessible
      accessibilityRole="header"
      onLayout={focusTitleOnInitialLayout}
      className={`text-4xl font-bold leading-tight text-ink ${className}`}
    >
      {children}
    </Text>
  );
}

export function SectionHeading({ children, className = '' }: TextProps) {
  return (
    <Text accessibilityRole="header" className={`text-xl font-semibold text-ink ${className}`}>
      {children}
    </Text>
  );
}

export function Body({ children, className = '' }: TextProps) {
  return <Text className={`text-lg leading-relaxed text-ink ${className}`}>{children}</Text>;
}

export function Muted({ children, className = '' }: TextProps) {
  return <Text className={`text-base leading-normal text-ink-muted ${className}`}>{children}</Text>;
}
