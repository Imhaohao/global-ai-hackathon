// A Coffea arabica leaf drawn in a 100-unit box: elliptic blade about 2.4 times longer than wide,
// a drip-tip (acuminate) point, a wavy (undulate) margin and eight pairs of lateral veins.
// Every function is a worklet so Reanimated can redraw the leaf on the UI thread each frame.

export type LeafPose = {
  /** Curl of the midrib, -1 to 1. Positive curls the tip toward +y. */
  bend: number;
  /** Roll around the midrib, -1 to 1. One half narrows as the leaf turns edge-on. */
  roll: number;
  /** Shifts the margin ripple so the edge looks like it moves in the wind. */
  ripple: number;
};

export type LeafPaths = { upperHalf: string; lowerHalf: string; midrib: string; veins: string };

export const LEAF_BOX = 100;
const SAMPLES = 64;
const PETIOLE = 0.07;
const HALF_WIDTH = 20;
const WIDEST_AT = 0.42;
const VEIN_PAIRS = 7;
const START_X = 4;
const LENGTH = 92;
const BASE_Y = 50;

type Point = { x: number; y: number; angle: number };

function midribPoints(bend: number): Point[] {
  'worklet';
  const points: Point[] = [];
  let x = START_X;
  let y = BASE_Y;
  const step = LENGTH / SAMPLES;
  for (let index = 0; index <= SAMPLES; index++) {
    const t = index / SAMPLES;
    const angle = bend * 0.9 * t * t;
    points.push({ x, y, angle });
    x += Math.cos(angle) * step;
    y += Math.sin(angle) * step;
  }
  return points;
}

// Widest at 42% of the blade with a rounded wedge base, then a concave taper into the drip tip.
function bladeProfile(blade: number): number {
  'worklet';
  if (blade < WIDEST_AT) return Math.pow(Math.sin((Math.PI / 2) * (blade / WIDEST_AT)), 0.7);
  const v = (blade - WIDEST_AT) / (1 - WIDEST_AT);
  return Math.pow(1 - v, 1.5) * (1 + 1.5 * v);
}

function bladeWidth(t: number, ripple: number): number {
  'worklet';
  if (t <= PETIOLE) return 0.6;
  const blade = (t - PETIOLE) / (1 - PETIOLE);
  const wave = 1 + 0.045 * Math.sin(blade * Math.PI * 9 + ripple) * Math.sin(Math.PI * blade);
  return HALF_WIDTH * bladeProfile(blade) * wave;
}

function offset(point: Point, distance: number) {
  'worklet';
  return { x: point.x - Math.sin(point.angle) * distance, y: point.y + Math.cos(point.angle) * distance };
}

function format(value: number): string {
  'worklet';
  return value.toFixed(2);
}

function halfPath(points: Point[], side: number, scale: number, ripple: number): string {
  'worklet';
  let path = `M${format(points[0].x)} ${format(points[0].y)}`;
  for (let index = 1; index < points.length; index++) {
    const edge = offset(points[index], side * scale * bladeWidth(index / SAMPLES, ripple));
    path += `L${format(edge.x)} ${format(edge.y)}`;
  }
  for (let index = points.length - 1; index >= 0; index--) {
    path += `L${format(points[index].x)} ${format(points[index].y)}`;
  }
  return `${path}Z`;
}

function veinPath(points: Point[], upperScale: number, lowerScale: number, ripple: number): string {
  'worklet';
  let path = '';
  for (let vein = 0; vein < VEIN_PAIRS; vein++) {
    const t = PETIOLE + 0.08 + vein * 0.09;
    const start = points[Math.round(t * SAMPLES)];
    const endIndex = Math.min(SAMPLES, Math.round((t + 0.11) * SAMPLES));
    const end = points[endIndex];
    const reach = 0.78 * bladeWidth(endIndex / SAMPLES, ripple);
    for (const scale of [-upperScale, lowerScale]) {
      const tip = offset(end, scale * reach);
      const bow = offset(points[Math.round((t + 0.03) * SAMPLES)], scale * reach * 0.6);
      path += `M${format(start.x)} ${format(start.y)}Q${format(bow.x)} ${format(bow.y)} ${format(tip.x)} ${format(tip.y)}`;
    }
  }
  return path;
}

export function leafPaths(pose: LeafPose): LeafPaths {
  'worklet';
  const points = midribPoints(pose.bend);
  const upperScale = 1 - Math.max(0, pose.roll) * 0.85;
  const lowerScale = 1 + Math.min(0, pose.roll) * 0.85;
  let midrib = `M${format(points[0].x)} ${format(points[0].y)}`;
  for (let index = 1; index < points.length; index++) midrib += `L${format(points[index].x)} ${format(points[index].y)}`;
  return {
    upperHalf: halfPath(points, -1, upperScale, pose.ripple),
    lowerHalf: halfPath(points, 1, lowerScale, pose.ripple),
    midrib,
    veins: veinPath(points, upperScale, lowerScale, pose.ripple),
  };
}

/** The pose of a leaf held up by wind at time `seconds`; three detuned waves keep it from looking looped. */
export function windPose(seconds: number, strength: number): LeafPose {
  'worklet';
  const gust = 0.6 + 0.4 * Math.sin(seconds * 0.7) * Math.sin(seconds * 0.23 + 1);
  return {
    bend: strength * (0.18 + 0.22 * gust * Math.sin(seconds * 2.1)),
    roll: strength * 0.55 * Math.sin(seconds * 1.3 + 0.6) * gust,
    ripple: seconds * 5 * (0.5 + gust),
  };
}
