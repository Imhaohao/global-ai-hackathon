import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

/** A finger tap on the phone screen, in screen points: a filled dot that presses, then a ring that spreads. */
export function Ripple({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame();
  if (frame < at - 4 || frame > at + 24) return null;
  const press = progress(frame, at - 4, 4) * (1 - progress(frame, at + 4, 8));
  const ring = progress(frame, at, 20);
  return (
    <>
      <div
        className="absolute rounded-full"
        style={{ left: x - 22, top: y - 22, width: 44, height: 44, background: "rgba(255,255,255,0.55)", opacity: press, scale: 0.7 + press * 0.3, boxShadow: "0 0 18px rgba(0,0,0,0.25)" }}
      />
      <div
        className="absolute rounded-full"
        style={{ left: x - 40, top: y - 40, width: 80, height: 80, boxShadow: "0 0 0 3px rgba(255,255,255,0.85)", opacity: 1 - ring, scale: 0.4 + ring * 0.9 }}
      />
    </>
  );
}
