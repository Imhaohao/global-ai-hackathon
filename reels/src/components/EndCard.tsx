import { Leaf } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";
import { Punch } from "./Punch";
import { RevealLines } from "./RevealLines";
import { Spore } from "./Spore";
import { Paper } from "./Surface";

/** The leaf mark: a rust spore glows on its tip, then cools to leaf green, the way an early catch should go. */
function LeafMark({ size }: { size: number }) {
  const frame = useCurrentFrame();
  const cooled = progress(frame, 34, 30);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <Leaf size={size} weight="fill" className="text-leaf" />
      <div className="absolute" style={{ left: size * 0.72, top: size * 0.26, opacity: 1 - cooled }}>
        <Spore x={0} y={0} size={size * 0.2} />
      </div>
      <span className="absolute rounded-full bg-leaf-soft" style={{ left: size * 0.72, top: size * 0.26, width: size * 0.08, height: size * 0.08, translate: "-50% -50%", opacity: cooled }} />
    </div>
  );
}

/** The sign-off: the mark, the name and the event, with room for the credits underneath. */
export function EndCard({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  const event = progress(frame, 22, 16);
  return (
    <Punch flash={0.6}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[260px] flex flex-col items-start gap-8">
          <LeafMark size={180} />
          <RevealLines lines={["Leaf Doctor"]} at={8} className="display-poster text-figure text-ink" />
          <p className="text-lead font-bold text-ink-muted" style={{ opacity: event, translate: `0 ${(1 - event) * 16}px` }}>
            Built at Hack-Nation Global AI Hackathon 7
          </p>
          {children}
        </div>
      </Paper>
    </Punch>
  );
}
