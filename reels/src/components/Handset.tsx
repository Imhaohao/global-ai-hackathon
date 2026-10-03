import type { ReactNode } from "react";

const BEZEL = 14;
const SCREEN_RADIUS = 44;

/** A plain Android handset. The body's corner radius is the screen's plus the bezel, so the curves stay concentric. */
export function Handset({ width, height, children, light = 0 }: { width: number; height: number; children: ReactNode; light?: number }) {
  return (
    <div
      className="relative"
      style={{
        width,
        height,
        padding: BEZEL,
        borderRadius: SCREEN_RADIUS + BEZEL,
        background: "linear-gradient(150deg, #34342f, #141412 60%)",
        boxShadow: `0 50px 110px rgba(16,18,14,0.5), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 ${120 * light}px ${30 * light}px color-mix(in srgb, var(--brand-rust) 35%, transparent)`,
      }}
    >
      <div className="relative size-full overflow-hidden bg-paper" style={{ borderRadius: SCREEN_RADIUS }}>
        {children}
        <div className="absolute left-1/2 top-[14px] size-[18px] -translate-x-1/2 rounded-full bg-black/85" />
      </div>
    </div>
  );
}
