import { Easing, interpolate } from "remotion";

export const settle = Easing.bezier(0.16, 1, 0.3, 1);
export const glide = Easing.bezier(0.65, 0, 0.35, 1);
export const leave = Easing.bezier(0.7, 0, 0.84, 0);
export const snap = Easing.bezier(0.7, 0, 0.1, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function progress(frame: number, start: number, duration: number, easing: (t: number) => number = settle) {
  return interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing });
}

export function between(frame: number, range: readonly [number, number], output: readonly [number, number], easing: (t: number) => number = settle) {
  return interpolate(frame, [...range], [...output], { ...clamp, easing });
}

export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
