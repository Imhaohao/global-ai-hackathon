"use client";

import { animate, motion, useMotionValue, useTransform, type Variants } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { easeDrawn, exitTransition } from "@/lib/motion";

export function lineReveal(delay: number): Variants {
  return {
    enter: { y: "110%" },
    present: { y: "0%", transition: { duration: 1, ease: easeDrawn, delay } },
    exit: { y: "-110%", transition: exitTransition },
  };
}

export function fadeReveal(delay: number, rise = 0): Variants {
  return {
    enter: { opacity: 0, y: rise },
    present: { opacity: 1, y: 0, transition: { duration: 0.9, ease: easeDrawn, delay } },
    exit: { opacity: 0, transition: exitTransition },
  };
}

export function MaskedLines({ lines, delay = 0, stagger = 0.09 }: { lines: string[]; delay?: number; stagger?: number }) {
  return lines.map((line, index) => (
    <span key={`${index}-${line}`} className="line-mask">
      <motion.span className="block" variants={lineReveal(delay + index * stagger)}>
        {line}
      </motion.span>
    </span>
  ));
}

export function Reveal({ children, delay = 0, rise = 16, className }: { children: ReactNode; delay?: number; rise?: number; className?: string }) {
  return (
    <motion.div variants={fadeReveal(delay, rise)} initial="enter" animate="present" exit="exit" className={className}>
      {children}
    </motion.div>
  );
}

export function SourceLine({ children, delay = 1.1 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.p variants={fadeReveal(delay)} className="max-w-[70ch] text-fineprint text-ink-muted">
      {children}
    </motion.p>
  );
}

const formatters: Record<number, Intl.NumberFormat> = {};

function formatterFor(decimals: number) {
  formatters[decimals] ??= new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return formatters[decimals];
}

export function CountUp({ to, decimals = 0, suffix = "", delay = 0.3, duration = 1.6 }: { to: number; decimals?: number; suffix?: string; delay?: number; duration?: number }) {
  const progress = useMotionValue(0);
  useEffect(() => {
    const controls = animate(progress, to, { duration, delay, ease: [...easeDrawn] as [number, number, number, number] });
    return () => controls.stop();
  }, [progress, to, delay, duration]);
  const text = useTransform(progress, (value) => `${formatterFor(decimals).format(value)}${suffix}`);
  return (
    <span className="inline-grid figures-tabular">
      <span aria-hidden className="invisible col-start-1 row-start-1">{`${formatterFor(decimals).format(to)}${suffix}`}</span>
      <motion.span aria-hidden className="col-start-1 row-start-1">{text}</motion.span>
      <span className="sr-only">{`${formatterFor(decimals).format(to)}${suffix}`}</span>
    </span>
  );
}
