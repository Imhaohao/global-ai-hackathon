import type { ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { colors } from '../../theme';
import { useLeafClock, WindBlownLeaf } from './Leaf';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const STAGE_WIDTH = 400;
const STAGE_HEIGHT = 420;
const HERO_LEAF_SIZE = 280;

// Each gust line is a long dash sliding along a gentle S-curve, so the air visibly moves left to right.
const GUSTS = [
  { y: 60, sway: 22, dash: 90, speed: 120, phase: 0, width: 1.4, opacity: 0.5 },
  { y: 110, sway: -18, dash: 160, speed: 95, phase: 160, width: 1, opacity: 0.7 },
  { y: 160, sway: 26, dash: 70, speed: 150, phase: 60, width: 1.8, opacity: 0.9 },
  { y: 205, sway: -30, dash: 200, speed: 110, phase: 260, width: 1.2, opacity: 0.6 },
  { y: 250, sway: 20, dash: 110, speed: 135, phase: 340, width: 2, opacity: 0.9 },
  { y: 300, sway: -16, dash: 80, speed: 100, phase: 120, width: 1, opacity: 0.5 },
  { y: 350, sway: 24, dash: 140, speed: 125, phase: 420, width: 1.4, opacity: 0.7 },
];
const GUST_PERIOD = 560;

// Distant leaves blow straight through, smaller and paler, to give the scene depth.
const DRIFTERS = [
  { size: 46, band: 0.18, speed: 70, offset: 0, opacity: 0.35, spin: 0.9 },
  { size: 34, band: 0.62, speed: 95, offset: 260, opacity: 0.25, spin: -1.2 },
  { size: 58, band: 0.82, speed: 55, offset: 120, opacity: 0.3, spin: 0.6 },
];

function gustPath(y: number, sway: number): string {
  return `M-60 ${y}C60 ${y - sway} 160 ${y + sway} 260 ${y}S400 ${y - sway} 470 ${y}`;
}

function Gust({ clock, gust }: { clock: SharedValue<number>; gust: (typeof GUSTS)[number] }) {
  const flowing = useAnimatedProps(() => ({
    strokeDashoffset: -((clock.value * gust.speed + gust.phase) % GUST_PERIOD),
  }));
  return (
    <AnimatedPath
      d={gustPath(gust.y, gust.sway)}
      animatedProps={flowing}
      stroke={colors.wind}
      strokeOpacity={gust.opacity}
      strokeWidth={gust.width}
      strokeLinecap="round"
      strokeDasharray={[gust.dash, GUST_PERIOD - gust.dash]}
      fill="none"
    />
  );
}

type StageSize = SharedValue<{ width: number; height: number }>;

function Drifter({ clock, stage, drifter }: { clock: SharedValue<number>; stage: StageSize; drifter: (typeof DRIFTERS)[number] }) {
  const flight = useAnimatedStyle(() => {
    const t = clock.value;
    const lane = stage.value.width + drifter.size * 2;
    return {
      opacity: drifter.opacity,
      transform: [
        { translateX: ((t * drifter.speed + drifter.offset) % lane) - drifter.size },
        { translateY: stage.value.height * drifter.band + Math.sin(t * 1.3 + drifter.offset) * 14 },
        { rotate: `${t * drifter.spin * 60}deg` },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, flight]} pointerEvents="none">
      <WindBlownLeaf size={drifter.size} clock={clock} strength={1.6} />
    </Animated.View>
  );
}

/** The login hero: wind lines stream across while the leaf rides them in front of `children`. */
export function WindHero({ children }: { children: ReactNode }) {
  const clock = useLeafClock();
  const stage = useSharedValue({ width: STAGE_WIDTH, height: STAGE_HEIGHT });
  const drift = useAnimatedStyle(() => {
    const t = clock.value;
    return {
      transform: [
        { translateX: Math.sin(t * 0.45) * 52 + Math.sin(t * 1.1) * 9 },
        { translateY: 20 + Math.sin(t * 0.8 + 1) * 26 + Math.cos(t * 0.37) * 12 },
        { rotate: `${-26 + Math.sin(t * 0.6) * 18 + Math.sin(t * 1.7) * 5}deg` },
      ],
    };
  });
  const measure = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    stage.value = { width, height };
  };

  return (
    <View accessible={false} onLayout={measure} className="min-h-96 flex-1 items-center justify-center overflow-hidden">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute' }}
      >
        {GUSTS.map((gust) => <Gust key={gust.y} clock={clock} gust={gust} />)}
      </Svg>
      {DRIFTERS.map((drifter) => <Drifter key={drifter.offset} clock={clock} stage={stage} drifter={drifter} />)}
      <View className="absolute inset-x-0 bottom-10 items-center">{children}</View>
      <Animated.View style={drift} pointerEvents="none">
        <WindBlownLeaf size={HERO_LEAF_SIZE} clock={clock} />
      </Animated.View>
    </View>
  );
}
