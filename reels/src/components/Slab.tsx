import type { CSSProperties, ReactNode } from "react";

type SlabProps = { children: ReactNode; className?: string; style?: CSSProperties; tone?: "raised" | "paper" | "leaf" | "night" };

const toneClass = {
  raised: "bg-paper-raised text-ink",
  paper: "bg-paper text-ink",
  leaf: "bg-leaf text-on-leaf",
  night: "bg-night/80 text-paper-raised",
} as const;

/** The one panel the reel uses for type over pictures: a filled card lifted by shadow, never outlined. */
export function Slab({ children, className, style, tone = "raised" }: SlabProps) {
  return (
    <div className={`rounded-lg shadow-[0_18px_50px_rgba(16,18,14,0.28),0_2px_6px_rgba(16,18,14,0.18)] ${toneClass[tone]} ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
