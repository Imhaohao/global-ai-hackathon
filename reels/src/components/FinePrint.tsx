import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

/** Where a figure comes from, in small type: the source and the year the data describes. */
export function FinePrint({ children, at, tone = "dark", className }: { children: ReactNode; at: number; tone?: "dark" | "light"; className?: string }) {
  const frame = useCurrentFrame();
  return (
    <p className={`text-fineprint text-pretty ${tone === "dark" ? "text-ink-muted" : "text-paper-raised/90 [text-shadow:0_1px_3px_rgba(16,18,14,0.9),0_0_18px_rgba(16,18,14,0.6)]"} ${className ?? ""}`} style={{ opacity: progress(frame, at, 14) }}>
      {children}
    </p>
  );
}
