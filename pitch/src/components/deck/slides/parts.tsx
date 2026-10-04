"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
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

export type BuildState = "built" | "inProgress" | "next";

const buildStateLabel: Record<BuildState, string> = {
  built: "Built and running",
  inProgress: "Being built this weekend",
  next: "Next step, not built",
};

const buildStateMark: Record<BuildState, string> = {
  built: "bg-leaf",
  inProgress: "not-measured-hatch ring-1 ring-ink-faint",
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
