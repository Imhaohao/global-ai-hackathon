"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

export const HAZE_FILTER_ID = "morning-haze";

/** Turbulent displacement that makes type shimmer like air over a sunlit slope. */
export function HazeFilter({ strength = 6 }: { strength?: number }) {
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const still = useReducedMotion();

  useEffect(() => {
    if (still) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const seconds = (now - start) / 1000;
      const x = 0.0045 + 0.0012 * Math.sin(seconds * 0.7);
      const y = 0.022 + 0.006 * Math.sin(seconds * 1.3 + 1.1);
      turbulence.current?.setAttribute("baseFrequency", `${x.toFixed(5)} ${y.toFixed(5)}`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [still]);

  return (
    <svg aria-hidden className="pointer-events-none absolute size-0">
      <filter id={HAZE_FILTER_ID} x="-5%" y="-10%" width="110%" height="130%">
        <feTurbulence ref={turbulence} type="fractalNoise" baseFrequency="0.0045 0.022" numOctaves={2} seed={4} result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale={still ? 0 : strength} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
