import type { CSSProperties } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { glide } from "../lib/ease";

export type Framing = { scale: number; x?: number; y?: number };

type PhotoProps = {
  src: string;
  from: Framing;
  to: Framing;
  /** Frames over which the camera travels from one framing to the other. */
  duration: number;
  origin?: string;
  style?: CSSProperties;
  className?: string;
};

/** A still photo filmed like a slow dolly: it eases from one framing to another across the shot. */
export function Photo({ src, from, to, duration, origin = "50% 50%", style, className }: PhotoProps) {
  const frame = useCurrentFrame();
  const travel = (start: number, end: number) => interpolate(frame, [0, duration], [start, end], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: glide });
  const scale = travel(from.scale, to.scale);
  const x = travel(from.x ?? 0, to.x ?? 0);
  const y = travel(from.y ?? 0, to.y ?? 0);
  return (
    <Img
      src={staticFile(src)}
      className={`absolute inset-0 size-full object-cover ${className ?? ""}`}
      style={{ ...style, scale: String(scale), translate: `${x}px ${y}px`, transformOrigin: origin }}
    />
  );
}
