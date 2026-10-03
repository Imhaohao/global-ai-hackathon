import { useEffect } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { View } from "react-native";

const PULSE_MS = 1400;

export function PulsingDot({ active }: { active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = active ? withRepeat(withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }), -1) : 0;
  }, [active, progress]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.6 * (1 - progress.value) : 0,
    transform: [{ scale: 1 + progress.value * 1.6 }],
  }));

  return (
    <View className="h-6 w-6 items-center justify-center">
      <Animated.View className="absolute h-4 w-4 rounded-full bg-live" style={haloStyle} />
      <View className={`h-4 w-4 rounded-full ${active ? "bg-live" : "bg-ink-muted"}`} />
    </View>
  );
}
