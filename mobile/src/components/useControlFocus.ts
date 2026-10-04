import { useState } from 'react';

import { colors } from '../theme';

export const CONTROL_FOCUS_STYLE = {
  outlineColor: colors.ink,
  outlineStyle: 'solid' as const,
  outlineWidth: 3,
};

export function useControlFocus() {
  const [isFocused, setIsFocused] = useState(false);
  return {
    isFocused,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
  };
}
