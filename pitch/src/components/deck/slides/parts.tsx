"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeDrawn } from "@/lib/motion";
import { fadeReveal, MaskedLines, SourceLine } from "../primitives";

export type Side = "left" | "right";

const washBySide: Record<Side, string> = {
  left: "paper-wash",
  right: "paper-wash -scale-x-100",
};

const columnBySide: Record<Side, string> = {
  left: "items-start",
  right: "items-end",
};

export function SideWash({ side }: { side: Side }) {
  return <motion.div aria-hidden variants={fadeReveal(0)} className={`pointer-events-none absolute inset-0 ${washBySide[side]}`} />;
}

export function CopyColumn({ side, children, source, align = "center" }: { side: Side; children: ReactNode; source?: ReactNode; align?: "center" | "end" | "start" }) {
  const justify = { center: "justify-center", end: "justify-end", start: "justify-start" }[align];
  return (
    <div className={`deck-gutter relative flex h-full flex-col ${justify} ${columnBySide[side]}`}>
      <SideWash side={side} />
      <div className="relative flex w-deck-column flex-col gap-deck-rise">
        {children}
        {source && <SourceLine>{source}</SourceLine>}
      </div>
    </div>
  );
}

export function Headline({ lines, delay = 0.15 }: { lines: string[]; delay?: number }) {
  return (
    <h2 className="display-headline text-headline text-ink">
      <MaskedLines lines={lines} delay={delay} />
    </h2>
  );
}

export function Lede({ children, delay = 0.6 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.p variants={fadeReveal(delay, 12)} className="lede max-w-[34ch] text-lede text-ink-muted">
      {children}
    </motion.p>
  );
}

export type BuildState = "built" | "emulator" | "next";

const buildStateLabel: Record<BuildState, string> = {
  built: "Built and running",
  emulator: "Built, run on an Android emulator",
  next: "Next step, not built",
};

const buildStateMark: Record<BuildState, string> = {
  built: "bg-leaf",
  emulator: "bg-leaf/50",
  next: "ring-1 ring-ink-faint",
};

export function BuildStateChip({ state, delay = 0.9 }: { state: BuildState; delay?: number }) {
  return (
    <motion.p variants={fadeReveal(delay)} className="flex items-center gap-2 text-caption font-semibold text-ink">
      <span aria-hidden className={`inline-block size-[0.8em] rounded-full ${buildStateMark[state]}`} />
      {buildStateLabel[state]}
    </motion.p>
  );
}

export function AppScreenshot({ name, alt, delay = 0.3, tilt = 0 }: { name: string; alt: string; delay?: number; tilt?: number }) {
  return (
    <motion.figure
      variants={{
        enter: { opacity: 0, y: 40, rotate: tilt * 2 },
        present: { opacity: 1, y: 0, rotate: tilt, transition: { duration: 0.9, ease: easeDrawn, delay } },
        exit: { opacity: 0, transition: { duration: 0.25 } },
      }}
      className="h-deck-screen shrink-0 overflow-hidden rounded-phone bg-paper-raised surface-raised"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/app-screens/${name}.webp`} alt={alt} className="h-full w-auto" />
    </motion.figure>
  );
}

export const emulatorNote =
  "Android emulator screenshots from docs/screens. Their verdicts come from the app's development test switch, so they show the screens, not the model's accuracy.";

type Screen = { name: string; alt: string };

export function ScreensLayout({ lines, lede, screens, state, note = emulatorNote }: { lines: string[]; lede: ReactNode; screens: Screen[]; state?: BuildState; note?: string }) {
  return (
    <div className="deck-gutter relative flex h-full items-center justify-start gap-deck-gap">
      <motion.div aria-hidden variants={fadeReveal(0)} className="paper-wash-wide pointer-events-none absolute inset-0" />
      <div className="relative flex w-deck-copy shrink-0 flex-col gap-deck-rise">
        <Headline lines={lines} />
        <Lede delay={0.3}>{lede}</Lede>
        {state && <BuildStateChip state={state} delay={1.2} />}
        <motion.p variants={fadeReveal(1.4)} className="text-fineprint text-ink-muted">
          {note}
        </motion.p>
      </div>
      <div className="relative flex gap-4">
        {screens.map((screen, index) => (
          <AppScreenshot key={screen.name} name={screen.name} alt={screen.alt} delay={0.4 + index * 0.2} tilt={screens.length > 1 ? (index === 0 ? -2 : 2) : 0} />
        ))}
      </div>
    </div>
  );
}
