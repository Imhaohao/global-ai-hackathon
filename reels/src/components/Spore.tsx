import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";
import { seededRandom } from "../lib/seeded";

type SporeProps = { x: number; y: number; size: number; opacity?: number };

/** The reel's motif: one rust spore as a point of light, a hot core falling off into a soft orange halo. */
export function Spore({ x, y, size, opacity = 1 }: SporeProps) {
  return (
    <div
      aria-hidden
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        opacity,
        translate: "-50% -50%",
        background: "radial-gradient(circle, #fff3d6 0 16%, var(--brand-rust-glow) 38%, var(--brand-rust) 62%, transparent 72%)",
        boxShadow: `0 0 ${size * 0.7}px ${size * 0.2}px color-mix(in srgb, var(--brand-rust) 60%, transparent), 0 0 ${size * 2.6}px ${size * 0.8}px color-mix(in srgb, var(--brand-rust-glow) 22%, transparent)`,
      }}
    />
  );
}

export type SporePoint = { x: number; y: number; size: number; delay: number };

/** Scatters spores inside a box with a fixed seed, so every render draws the same field. */
export function scatterSpores(seed: number, count: number, box: { x: number; y: number; width: number; height: number }, sizes: [number, number], spread: number): SporePoint[] {
  const random = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: box.x + random() * box.width,
    y: box.y + random() * box.height,
    size: sizes[0] + random() * (sizes[1] - sizes[0]),
    delay: Math.round(random() * spread),
  }));
}

type SporeFieldProps = { points: SporePoint[]; at: number; grow?: number; flicker?: boolean };

/** Spores lighting up one after another, each swelling from nothing and then breathing. */
export function SporeField({ points, at, grow = 14, flicker = true }: SporeFieldProps) {
  const frame = useCurrentFrame();
  return (
    <>
      {points.map((point, index) => {
        const lit = progress(frame, at + point.delay, grow);
        const breath = flicker ? 0.85 + 0.15 * Math.sin(frame * 0.18 + index * 1.7) : 1;
        return lit > 0 ? <Spore key={index} x={point.x} y={point.y} size={point.size * lit} opacity={lit * breath} /> : null;
      })}
    </>
  );
}
