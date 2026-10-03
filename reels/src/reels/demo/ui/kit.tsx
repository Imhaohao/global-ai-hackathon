import type { Icon } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";

/** A card on the recreated app screens, matching the apps' filled cards (rounded, no outline). */
export function ScreenCard({ children, tone = "surface", className, style }: { children: ReactNode; tone?: "surface" | "leaf" | "soft"; className?: string; style?: CSSProperties }) {
  const toneClass = { surface: "bg-paper-raised text-ink", leaf: "bg-leaf text-on-leaf", soft: "bg-leaf-soft text-ink" }[tone];
  return (
    <div className={`rounded-lg p-5 ${toneClass} ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}

type ScreenButtonProps = { label: string; icon: Icon; variant?: "primary" | "quiet" | "inverse"; pressed?: boolean; style?: CSSProperties };

const BUTTON_TONE = {
  primary: "bg-leaf text-on-leaf",
  quiet: "bg-paper-sunken text-ink",
  inverse: "bg-on-leaf/15 text-on-leaf",
} as const;

/** The apps' one button: a filled pill with an icon and a verb-first label. */
export function ScreenButton({ label, icon: Glyph, variant = "primary", pressed = false, style }: ScreenButtonProps) {
  return (
    <div
      className={`flex min-h-[64px] items-center justify-center gap-3 rounded-md px-5 text-app-heading font-bold ${BUTTON_TONE[variant]}`}
      style={{ ...style, scale: pressed ? "0.96" : "1" }}
    >
      <Glyph size={30} weight="bold" />
      {label}
    </div>
  );
}

/** A soft rust ring that marks the part of a screen the voice is talking about. */
export function Spotlight({ on, children, className }: { on: number; children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg ${className ?? ""}`}
      style={{ boxShadow: `0 0 0 ${4 * on}px color-mix(in srgb, var(--brand-rust) ${70 * on}%, transparent), 0 0 ${40 * on}px ${6 * on}px color-mix(in srgb, var(--brand-rust-glow) ${40 * on}%, transparent)` }}
    >
      {children}
    </div>
  );
}
