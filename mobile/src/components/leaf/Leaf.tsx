import type { IconProps } from 'phosphor-react-native';
import { useId, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '../../theme';
import { LEAF_BOX, leafPaths, windPose, type LeafPose } from './leafGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const RESTING_POSE: LeafPose = { bend: 0.22, roll: 0.12, ripple: 0.8 };
const ICON_TILT = -40;
const VIEW_BOX = `0 0 ${LEAF_BOX} ${LEAF_BOX}`;

/** Seconds since mount, advanced on the UI thread. Stays at `frozenAt` when reduced motion is on. */
export function useLeafClock(speed = 1, frozenAt = 2.4): SharedValue<number> {
  const reduceMotion = useReducedMotion();
  const clock = useSharedValue(frozenAt);
  useFrameCallback((frame) => {
    clock.value = frozenAt + (frame.timeSinceFirstFrame / 1000) * speed;
  }, !reduceMotion);
  return clock;
}

const LOWER_PAINT = { fill: colors['leaf-under'] };
const VEIN_PAINT = { stroke: colors['leaf-vein'], strokeWidth: 0.7, strokeLinecap: 'round', fill: 'none', opacity: 0.75 } as const;
const MIDRIB_PAINT = { stroke: colors['leaf-vein'], strokeWidth: 1.1, strokeLinecap: 'round', fill: 'none' } as const;

function LeafFills({ upperHalf, lowerHalf, midrib, veins, gradientId }: ReturnType<typeof leafPaths> & { gradientId: string }) {
  return (
    <>
      <Path d={lowerHalf} {...LOWER_PAINT} />
      <Path d={upperHalf} fill={`url(#${gradientId})`} />
      <Path d={veins} {...VEIN_PAINT} />
      <Path d={midrib} {...MIDRIB_PAINT} />
    </>
  );
}

function SheenGradient({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={colors['leaf-sheen']} />
        <Stop offset="0.55" stopColor={colors['leaf-top']} />
        <Stop offset="1" stopColor={colors['leaf-top']} />
      </LinearGradient>
    </Defs>
  );
}

/** The full-color leaf, still. Used as the brand mark. */
export function LeafGlyph({ size, pose = RESTING_POSE, tilt = ICON_TILT }: { size: number; pose?: LeafPose; tilt?: number }) {
  const gradientId = `leaf-sheen-${useId().replace(/:/g, '')}`;
  const paths = useMemo(() => leafPaths(pose), [pose]);
  return (
    <View accessible={false} style={{ width: size, height: size, transform: [{ rotate: `${tilt}deg` }] }}>
      <Svg width={size} height={size} viewBox={VIEW_BOX}>
        <SheenGradient id={gradientId} />
        <LeafFills {...paths} gradientId={gradientId} />
      </Svg>
    </View>
  );
}

/** A one-color leaf that drops into any slot that takes a Phosphor icon. */
export function LeafIcon({ size = 24, color = colors.accent, weight }: IconProps & { weight?: string }) {
  const paths = useMemo(() => leafPaths(RESTING_POSE), []);
  const pixelSize = Number(size);
  const filled = weight === 'fill' || weight === 'duotone';
  return (
    <View accessible={false} style={{ width: pixelSize, height: pixelSize, transform: [{ rotate: `${ICON_TILT}deg` }] }}>
      <Svg width={pixelSize} height={pixelSize} viewBox={VIEW_BOX}>
        <Path d={paths.upperHalf} fill={filled ? color : 'none'} stroke={color} strokeWidth={5} strokeLinejoin="round" />
        <Path d={paths.lowerHalf} fill={filled ? color : 'none'} stroke={color} strokeWidth={5} strokeLinejoin="round" />
        {!filled && <Path d={paths.veins} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />}
      </Svg>
    </View>
  );
}

/** A leaf whose shape is redrawn every frame from the wind clock. */
export function WindBlownLeaf({ size, clock, strength = 1 }: { size: number; clock: SharedValue<number>; strength?: number }) {
  const gradientId = `leaf-sheen-${useId().replace(/:/g, '')}`;
  const shape = useDerivedValue(() => leafPaths(windPose(clock.value, strength)));
  const lowerProps = useAnimatedProps(() => ({ d: shape.value.lowerHalf }));
  const upperProps = useAnimatedProps(() => ({ d: shape.value.upperHalf }));
  const veinProps = useAnimatedProps(() => ({ d: shape.value.veins }));
  const midribProps = useAnimatedProps(() => ({ d: shape.value.midrib }));
  return (
    <Svg width={size} height={size} viewBox={VIEW_BOX}>
      <SheenGradient id={gradientId} />
      <AnimatedPath animatedProps={lowerProps} {...LOWER_PAINT} />
      <AnimatedPath animatedProps={upperProps} fill={`url(#${gradientId})`} />
      <AnimatedPath animatedProps={veinProps} {...VEIN_PAINT} />
      <AnimatedPath animatedProps={midribProps} {...MIDRIB_PAINT} />
    </Svg>
  );
}

/** The app's loading indicator: a leaf tumbling in a gust. */
export function LeafLoader({ size = 44, label }: { size?: number; label: string }) {
  const clock = useLeafClock(1.8);
  const tumble = useAnimatedStyle(() => ({
    transform: [
      { translateY: Math.sin(clock.value * 2.2) * size * 0.06 },
      { rotate: `${ICON_TILT + Math.sin(clock.value * 1.6) * 28}deg` },
    ],
  }));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ width: size, height: size }}>
      <Animated.View style={tumble}>
        <WindBlownLeaf size={size} clock={clock} strength={1.5} />
      </Animated.View>
    </View>
  );
}

export function LeafLoadingScreen({ label }: { label: string }) {
  return (
    <View className="flex-1 items-center justify-center">
      <LeafLoader size={72} label={label} />
    </View>
  );
}

/** The leaf riding the wind over a pale disc, used wherever a screen needs the motif as its picture. */
export function LeafEmblem({ size, speed = 0.8 }: { size: number; speed?: number }) {
  const clock = useLeafClock(speed, 6);
  return (
    <View accessible={false} className="items-center justify-center rounded-full bg-botanical" style={{ width: size, height: size }}>
      <View style={{ transform: [{ rotate: '-30deg' }] }}>
        <WindBlownLeaf size={size * 0.9} clock={clock} strength={0.8} />
      </View>
    </View>
  );
}
