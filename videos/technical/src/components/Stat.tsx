import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { leave, progress } from "../lib/ease";
import { Counter } from "./Counter";

type StatProps = { value: number; icon: ReactNode; at: number; exitAt?: number; tone?: "text" | "rust" };

/** One number and one icon, nothing else: the voice says what it means. */
export function Stat({ value, icon, at, exitAt, tone = "text" }: StatProps) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14) - (exitAt === undefined ? 0 : progress(frame, exitAt, 10, leave));
  const colour = tone === "rust" ? "text-rust-glow" : "text-text";
  return (
    <div className="flex items-center gap-8" style={{ opacity: shown, translate: `${(1 - progress(frame, at, 14)) * 40}px 0` }}>
      <div className={`flex size-[150px] items-center justify-center ${colour}`}>{icon}</div>
      <Counter to={value} at={at} duration={22} className={`display-poster text-poster ${colour} ${tone === "rust" ? "rust-glow" : ""}`} />
    </div>
  );
}
