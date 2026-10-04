import { Easing, interpolate } from "remotion";

export const settle = Easing.bezier(0.16, 1, 0.3, 1);
export const glide = Easing.bezier(0.65, 0, 0.35, 1);
export const leave = Easing.bezier(0.5, 0, 0.75, 0);
export const snap = Easing.bezier(0.7, 0, 0.1, 1);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export function progress(frame: number, start: number, duration: number, easing: (t: number) => number = settle) {
  return interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing });
}

/** Rises over `rise` frames from `start`, holds, then falls over `fall` frames ending at `end`. */
export function window(frame: number, start: number, end: number, rise = 10, fall = 8) {
  return Math.min(progress(frame, start, rise), 1 - progress(frame, end - fall, fall, leave));
}

export const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
