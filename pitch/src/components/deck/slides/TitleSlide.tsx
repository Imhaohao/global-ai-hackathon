"use client";

import { motion } from "motion/react";
import { easeDrawn } from "@/lib/motion";
import { HAZE_FILTER_ID, HazeFilter } from "../HazeFilter";
import { fadeReveal, MaskedLines } from "../primitives";

const riseBehindSlope = {
  enter: { y: "38%", opacity: 0 },
  present: { y: "0%", opacity: 1, transition: { duration: 2.2, ease: easeDrawn, delay: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
};

export function PosterTitle({ text }: { text: string }) {
  return (
    <div className="flex h-full flex-col items-center pt-deck-title">
      <HazeFilter />
      <motion.h1
        variants={riseBehindSlope}
        style={{ filter: `url(#${HAZE_FILTER_ID})` }}
        className="display-poster whitespace-nowrap text-poster text-ink"
      >
        {text}
      </motion.h1>
    </div>
  );
}

export function TitleSlide() {
  return <PosterTitle text="Leaf Doctor" />;
}

export function TitleForeground() {
  return (
    <div className="deck-gutter relative flex h-full items-end justify-between gap-deck-gap">
      <motion.div aria-hidden variants={fadeReveal(1.2)} className="paper-wash-low pointer-events-none absolute inset-0" />
      <p className="display-headline relative text-lede text-ink">
        <MaskedLines lines={["Crop disease help that", "works on a flip phone,", "with no internet."]} delay={1.6} />
      </p>
      <motion.p variants={fadeReveal(2.2)} className="relative text-caption text-ink-muted">
        Hack-Nation Global AI Hackathon 7, October 2026
      </motion.p>
    </div>
  );
}
