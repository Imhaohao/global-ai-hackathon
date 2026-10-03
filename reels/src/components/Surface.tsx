import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

function Fibers() {
  return (
    <svg className="absolute inset-0 size-full mix-blend-multiply" aria-hidden>
      <filter id="paper-mottle">
        <feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves={3} seed={5} />
        <feColorMatrix values="0 0 0 0 0.42  0 0 0 0 0.39  0 0 0 0 0.33  0 0 0 0.14 0" />
      </filter>
      <filter id="paper-tooth">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={2} seed={3} />
        <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.28  0 0 0 0 0.24  0 0 0 0.18 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-mottle)" />
      <rect width="100%" height="100%" filter="url(#paper-tooth)" />
    </svg>
  );
}

/** The morning-mist paper every scene sits on. */
export function Paper({ children, tone = "paper" }: { children?: ReactNode; tone?: "paper" | "night" }) {
  return (
    <AbsoluteFill className={tone === "paper" ? "bg-paper" : "bg-night"}>
      {tone === "paper" && <Fibers />}
      {children}
    </AbsoluteFill>
  );
}

/** Film grain that changes every frame, so stills and drawn UI share the photos' texture. */
export function Grain({ strength = 0.1 }: { strength?: number }) {
  const frame = useCurrentFrame();
  const id = `grain-${frame % 8}`;
  return (
    <svg className="pointer-events-none absolute inset-0 size-full mix-blend-overlay" style={{ opacity: strength }} aria-hidden>
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves={2} seed={frame % 8} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${id})`} />
    </svg>
  );
}

export function Vignette({ strength = 0.35 }: { strength?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(120% 90% at 50% 42%, transparent 52%, rgba(16,18,14,${strength}) 100%)` }}
    />
  );
}

/** A soft wash from the bottom of a photo, so captions sit on calm ground. */
export function FloorShade({ strength = 0.55, from = 55 }: { strength?: number; from?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{ background: `linear-gradient(to bottom, transparent ${from}%, rgba(16,18,14,${strength}) 100%)` }}
    />
  );
}
