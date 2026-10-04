import { AccessibilityInfo, Platform, type Text, type View } from 'react-native';

export function moveScreenReaderFocus(target: Text | View) {
  if (Platform.OS === 'web') {
    (target as unknown as HTMLElement).focus?.({ preventScroll: true });
    return;
  }
  AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
}
