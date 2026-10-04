import { useCurrentFrame } from "remotion";

/** The brand motif: a glowing rust spore that breathes. Light only, never a fill behind text. */
export function Spore({ size = 18, intensity = 1 }: { size?: number; intensity?: number }) {
  const frame = useCurrentFrame();
  const breath = 0.85 + 0.15 * Math.sin(frame / 9);
  return (
    <div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle, #fff3d6 0%, var(--brand-rust-glow) 35%, var(--brand-rust) 70%)",
        boxShadow: `0 0 ${size * 1.6 * breath}px ${size * 0.5}px color-mix(in srgb, var(--brand-rust) ${55 * intensity}%, transparent), 0 0 ${size * 5}px ${size}px color-mix(in srgb, var(--brand-rust-glow) ${22 * intensity}%, transparent)`,
        opacity: intensity,
      }}
    />
  );
}
