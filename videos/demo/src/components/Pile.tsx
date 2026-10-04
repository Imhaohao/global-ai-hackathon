import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";

type TileProps = { at: number; until: number; x: number; y: number; tilt: number; width: number; children: ReactNode };

/**
 * One photo landing on the pile: it drops in from the right, tilted, keeps drifting while more land on it, and is
 * crushed away with the rest when the beat ends.
 */
export function Tile({ at, until, x, y, tilt, width, children }: TileProps) {
  const frame = useCurrentFrame();
  const land = progress(frame, at, 12, settle);
  const drift = interpolate(frame, [at, until], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const crush = progress(frame, until - 8, 8, leave);
  return (
    <div
      className="absolute overflow-hidden rounded-[22px] bg-night"
      style={{
        left: x,
        top: y,
        width,
        opacity: land * (1 - crush),
        translate: `${(1 - land) * 320 + drift * 22}px ${drift * -12 + crush * 50}px`,
        rotate: `${tilt * (1 + (1 - land) * 2.4)}deg`,
        scale: 1.06 - 0.06 * land - crush * 0.08,
        boxShadow: "0 50px 110px rgba(0,0,0,0.6), 0 0 0 10px #f2f0ea",
      }}
    >
      {children}
    </div>
  );
}
