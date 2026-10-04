import { interpolate } from "remotion";
import { glide } from "./ease.ts";

/** A value that glides between keyframes given as [frame, value] pairs, holding before the first and after the last. */
export function track(frame: number, keys: [number, number][]) {
  if (keys.length === 1) return keys[0][1];
  return interpolate(frame, keys.map(([at]) => at), keys.map(([, value]) => value), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: glide });
}
