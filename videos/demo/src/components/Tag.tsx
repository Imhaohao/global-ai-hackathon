import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress, window } from "../lib/ease";

type TagProps = { icon?: ReactNode; children: ReactNode; from: number; to: number; tone?: "night" | "rust" };

/**
 * A short fact that sits beside the device, sliding in from below and leaving with a soft fade. Every tag sits on the
 * same neutral surface; the rust tone only lights the icon, to mark caveats a viewer must not miss (demo data,
 * simulated sightings).
 */
export function Tag({ icon, children, from, to, tone = "night" }: TagProps) {
  const frame = useCurrentFrame();
  const shown = window(frame, from, to, 12, 8);
  if (shown <= 0) return null;
  const rise = 1 - progress(frame, from, 14);
  const iconLight = tone === "rust" ? "text-rust-glow drop-shadow-[0_0_10px_var(--brand-rust)]" : "text-leaf-soft";
  return (
    <div
      className="flex w-fit items-center gap-4 rounded-full bg-night-raised/85 py-5 pl-7 pr-9 text-lead font-medium text-on-night"
      style={{ opacity: shown, translate: `0 ${rise * 24}px`, filter: `blur(${rise * 6}px)`, boxShadow: "0 12px 40px rgba(0,0,0,0.35)", backdropFilter: "blur(14px)" }}
    >
      {icon && <span className={`flex ${iconLight}`}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}
