import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";

const IMPACT_FRAMES = 12;

function wobble(frame: number, salt: number) {
  return Math.sin(frame * 2.7 + salt) * 0.6 + Math.sin(frame * 5.3 + salt * 2.1) * 0.4;
}

function shakeAt(frame: number, hits: readonly number[], strength: number) {
  const hit = hits.filter((at) => frame >= at && frame < at + IMPACT_FRAMES).at(-1);
  if (hit === undefined) return { x: 0, y: 0 };
  const decay = Math.pow(1 - (frame - hit) / IMPACT_FRAMES, 2);
  return { x: wobble(frame, 1.3) * strength * decay, y: wobble(frame, 4.1) * strength * decay };
}

/** Knocks the frame about for a moment after each hit, the way a handheld camera jolts. */
export function Impact({ hits, strength = 10, children }: { hits: readonly number[]; strength?: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { x, y } = shakeAt(frame, hits, strength);
  return (
    <div className="absolute inset-0" style={{ translate: `${x}px ${y}px` }}>
      {children}
    </div>
  );
}
