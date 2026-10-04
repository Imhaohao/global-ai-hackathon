import type { ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { glide } from "../lib/ease";
import { FRAME } from "../lib/timeline";

export type Shot = { at: number; x: number; y: number; scale: number };

/** Interpolates a camera between shots: (x, y) is the stage point centred in frame, scale the zoom. */
function cameraAt(frame: number, shots: Shot[]) {
  const frames = shots.map((shot) => shot.at);
  const options = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: glide } as const;
  const pick = (key: "x" | "y" | "scale") => (shots.length === 1 ? shots[0][key] : interpolate(frame, frames, shots.map((shot) => shot[key]), options));
  return { x: pick("x"), y: pick("y"), scale: pick("scale") };
}

/** A 1920x1080 stage seen through a moving camera: zooms aim at whatever part the voice is explaining. */
export function Camera({ shots, children }: { shots: Shot[]; children: ReactNode }) {
  const frame = useCurrentFrame();
  const camera = cameraAt(frame, shots);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-0 top-0"
        style={{
          width: FRAME.width,
          height: FRAME.height,
          transformOrigin: "0 0",
          transform: `translate(${FRAME.width / 2}px, ${FRAME.height / 2}px) scale(${camera.scale}) translate(${-camera.x}px, ${-camera.y}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
