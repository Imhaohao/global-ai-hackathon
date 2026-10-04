import type { ReactNode } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";

/** The backdrop behind a phone shot: a frame of real footage, heavily blurred and darkened so the device reads as the subject. */
export function Stage({ backdrop, children }: { backdrop: string; children: ReactNode }) {
  return (
    <AbsoluteFill className="bg-night">
      <Img src={staticFile(backdrop)} className="absolute inset-0 size-full object-cover" style={{ filter: "blur(28px) saturate(0.8) brightness(0.42)", scale: 1.15 }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 35% 50%, rgba(31,81,53,0.28) 0%, rgba(13,15,11,0.7) 70%)" }} />
      {children}
    </AbsoluteFill>
  );
}

/** Places a phone (or any device) at an offset from the frame centre. */
export function Place({ x, y = 0, children }: { x: number; y?: number; children: ReactNode }) {
  return (
    <AbsoluteFill className="items-center justify-center">
      <div style={{ translate: `${x}px ${y}px` }}>{children}</div>
    </AbsoluteFill>
  );
}

/** The column of facts to the right of a phone shot. */
export function Facts({ children, left = 1040, width = 780 }: { children: ReactNode; left?: number; width?: number }) {
  return (
    <div className="absolute flex flex-col gap-6" style={{ left, top: 0, bottom: 0, justifyContent: "center", width }}>
      {children}
    </div>
  );
}
