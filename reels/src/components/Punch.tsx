import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

/** Every hard cut lands a little close and settles, with a paper-white flash burning off. */
export function Punch({ children, flash = 0.75 }: { children: ReactNode; flash?: number }) {
  const frame = useCurrentFrame();
  const settled = progress(frame, 0, 10);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ scale: String(1.06 - 0.06 * settled) }}>
        {children}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-paper-raised" style={{ opacity: flash * (1 - progress(frame, 0, 6)) }} />
    </div>
  );
}
