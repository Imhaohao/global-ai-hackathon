import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { glide } from "../lib/ease";

/** A camera position: zoom and offset of the framed subject, in frame pixels, at a local frame. */
export type CameraKey = { at: number; scale: number; x: number; y: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: glide } as const;

/** Moves its children between camera keys with an ease-in-out glide, for push-ins and crop-ins on a detail. */
export function Camera({ keys, children }: { keys: CameraKey[]; children: ReactNode }) {
  const frame = useCurrentFrame();
  const frames = keys.map((key) => key.at);
  const pick = (field: "scale" | "x" | "y") => (keys.length === 1 ? keys[0][field] : interpolate(frame, frames, keys.map((key) => key[field]), clamp));
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ scale: pick("scale"), translate: `${pick("x")}px ${pick("y")}px` }}>
      {children}
    </div>
  );
}
