import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

export function useMeasuredWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width)), []);
  return { width, onLayout };
}
