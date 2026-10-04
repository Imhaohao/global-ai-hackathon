import { AirplaneTilt, ChatText, GlobeSimpleX } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";

export type MotifMark = "airplane" | "zeroInternet" | "noData" | "text";

const MARKS: Record<MotifMark, { icon: ReactNode; label: string }> = {
  airplane: { icon: <AirplaneTilt size={60} weight="fill" />, label: "Airplane mode" },
  zeroInternet: { icon: <GlobeSimpleX size={60} weight="bold" />, label: "Zero internet" },
  noData: { icon: <GlobeSimpleX size={60} weight="bold" />, label: "No data" },
  text: { icon: <ChatText size={60} weight="fill" />, label: "Just a text" },
};

export type MotifWindow = { from: number; to: number; marks: MotifMark[] };

/**
 * The recurring offline motif: big marks in the same corner through every offline beat (airplane mode and zero
 * internet for the app, no data and just a text for SMS). Rust lights the icon only; the pill stays neutral.
 */
export function Motif({ windows }: { windows: MotifWindow[] }) {
  const frame = useCurrentFrame();
  const active = windows.find((window) => frame >= window.from - 2 && frame < window.to + 8);
  if (!active) return null;
  const shown = progress(frame, active.from, 10, settle) * (1 - progress(frame, active.to - 2, 8, leave));
  return (
    <div className="absolute flex flex-col items-start gap-5" style={{ left: 1250, top: 120, opacity: shown }}>
      {active.marks.map((mark, index) => {
        const land = progress(frame, active.from + index * 6, 10, settle);
        const slam = 1 + 0.35 * (1 - progress(frame, active.from + index * 6, 9, settle));
        return (
          <div key={mark} data-box="motif" className="flex items-center gap-5 rounded-full bg-night-raised/85 py-5 pl-7 pr-10 text-title text-on-night" style={{ translate: `${(1 - land) * 60}px 0`, scale: slam, opacity: land, boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}>
            <span className="flex text-rust-glow drop-shadow-[0_0_14px_var(--brand-rust)]">{MARKS[mark].icon}</span>
            <span className="display-headline whitespace-nowrap" style={{ fontSize: 64, lineHeight: 1.1 }}>
              {MARKS[mark].label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
