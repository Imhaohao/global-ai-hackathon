"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { facts, sourceLine } from "@/lib/facts";
import { easeDrawn } from "@/lib/motion";
import { CountUp, fadeReveal, SourceLine } from "../primitives";
import type { SlideProps } from "../slides";
import { CopyColumn, Headline, Lede, type Side } from "./parts";

export function StepSwap({ step, children }: { step: number; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={step} initial="enter" animate="present" exit="exit" className="absolute inset-0">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function NoorSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="left" source="Noor is the persona from the hackathon brief. Her farm is fictional; the evidence in this deck comes from Kenya's coffee belt.">
          <Headline lines={["Noor grows coffee", "on a terraced slope", "in Kenya's highlands."]} />
        </CopyColumn>
      ) : (
        <CopyColumn side="left">
          <Headline lines={["This morning she found", "orange powder under", "a leaf."]} />
          <Lede>That powder is the first sign of coffee leaf rust, which spreads from tree to tree and farm to farm.</Lede>
        </CopyColumn>
      )}
    </StepSwap>
  );
}

export function Figure({ value, decimals, suffix, label, delay }: { value: number; decimals: number; suffix: string; label: string; delay: number }) {
  return (
    <motion.div variants={fadeReveal(delay, 18)} className="flex flex-col gap-deck-hairline">
      <p className="display-headline text-figure text-ink">
        <CountUp to={value} decimals={decimals} suffix={suffix} delay={delay + 0.2} />
      </p>
      <p className="max-w-[22ch] text-body text-ink-muted">{label}</p>
    </motion.div>
  );
}

const FARMERS_PER_OFFICER = facts.extensionTarget.value;
const DOT_COLUMNS = 40;

export function OfficerField() {
  const dots = Array.from({ length: FARMERS_PER_OFFICER + 1 }, (_, index) => index);
  return (
    <div role="img" aria-label="600 grey dots for farmers and one green dot for the extension officer" className="grid w-deck-column gap-deck-dot" style={{ gridTemplateColumns: `repeat(${DOT_COLUMNS}, minmax(0, 1fr))` }}>
      {dots.map((index) => (
        <motion.span
          key={index}
          variants={{
            enter: { opacity: 0, scale: 0.2 },
            present: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: easeDrawn, delay: 0.4 + (index % DOT_COLUMNS) * 0.012 + Math.floor(index / DOT_COLUMNS) * 0.05 } },
            exit: { opacity: 0 },
          }}
          className={`aspect-square rounded-full ${index === 0 ? "bg-leaf ring-2 ring-leaf/30" : "bg-ink-faint/70"}`}
        />
      ))}
    </div>
  );
}

type PhoneSegment = { key: string; label: string; share: number; className: string };

const ruralPhones: PhoneSegment[] = [
  { key: "smart", label: "Smartphone", share: facts.ruralSmartphoneMain.value, className: "bg-ink-faint/60" },
  { key: "basic", label: "Basic text phone", share: facts.ruralBasicPhoneMain.value, className: "bg-leaf" },
  { key: "none", label: "No phone", share: Math.round((100 - facts.ruralPhoneOwnership.value) * 10) / 10, className: "hatch-ink" },
];

const placedPhones = ruralPhones.map((segment, index) => {
  const before = ruralPhones.slice(0, index).reduce((sum, previous) => sum + previous.share, 0);
  return { ...segment, left: segment.key === "none" ? facts.ruralPhoneOwnership.value : before };
});

export function PhoneBar() {
  const placed = placedPhones;
  return (
    <div className="flex w-deck-column flex-col gap-deck-hairline">
      <div role="img" aria-label="Main phone of rural adults in Kenya, 2024: smartphone 52.8%, basic text phone 38.4%, no phone 8.5%" className="relative h-deck-bar w-full">
        {placed.map((segment, index) => (
          <motion.span
            key={segment.key}
            variants={{
              enter: { scaleX: 0 },
              present: { scaleX: 1, transition: { duration: 0.9, ease: easeDrawn, delay: 0.5 + index * 0.35 } },
              exit: { opacity: 0 },
            }}
            style={{ left: `${segment.left}%`, width: `${segment.share}%`, originX: 0 }}
            className={`absolute inset-y-0 ${segment.className}`}
          />
        ))}
      </div>
      <div className="relative h-deck-labels w-full text-caption">
        {placed.map((segment, index) => (
          <motion.p key={segment.key} variants={fadeReveal(0.9 + index * 0.35)} style={{ left: segment.key === "none" ? "100%" : `${segment.left}%` }} className={`absolute top-0 flex flex-col ${segment.key === "none" ? "-translate-x-full items-end ps-0" : ""}`}>
            <span className="figures-tabular font-bold text-ink">{segment.share.toFixed(1)}%</span>
            <span className="whitespace-nowrap text-ink-muted">{segment.label}</span>
          </motion.p>
        ))}
      </div>
    </div>
  );
}

const statementLines = [
  "Because of this tool, Noor",
  "will find out what is wrong",
  "with a sick coffee leaf, from",
  "any phone and with no internet,",
  "and reach a verified person",
  "about it within a day of seeing",
  "the spots, which she would",
  "otherwise do late or not at all.",
];

type Because = { lead: string; detail: string; source: string };

const becauseRows: Because[] = [
  { lead: "The internet does not reach most of the slope.", detail: "Only 33.7% of rural adults go online every day, and 38.4% use a basic text phone as their main phone.", source: sourceLine("ruralDailyInternet", "ruralBasicPhoneMain") },
  { lead: "Local help is stretched.", detail: "Kenya targets one extension officer per 600 farmers by 2029 and says the ratio has not improved.", source: sourceLine("extensionTarget") },
  { lead: "Trained apps can beat guessing.", detail: "A cassava diagnosis app was right 65% of the time in the field, against 40-58% for extension agents and 18-31% for farmers.", source: sourceLine("nuruField") },
  { lead: "Advice alone is not enough.", detail: "Phone-only farm advice moved yields 4%, with a confidence interval from -3% to 10%, so the answer must also reach a person.", source: sourceLine("phoneAdviceYield") },
];

function BecauseList() {
  return (
    <ol className="flex flex-col gap-deck-hairline">
      {becauseRows.map((row, index) => (
        <motion.li key={row.lead} variants={fadeReveal(0.3 + index * 0.18, 10)} className="grid grid-cols-[1.4em_1fr] gap-x-3 text-body">
          <span aria-hidden className="mt-[0.45em] size-[0.55em] rounded-full rust-mark" />
          <p>
            <span className="font-bold text-ink">{row.lead} </span>
            <span className="text-ink-muted">{row.detail}</span>
          </p>
          <span />
          <p className="text-fineprint text-ink-faint">{row.source}</p>
        </motion.li>
      ))}
    </ol>
  );
}

export function StatementSlide({ step }: SlideProps) {
  const side: Side = "right";
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side={side}>
          <h2 className="display-headline text-statement text-ink">
            {statementLines.map((line, index) => (
              <span key={line} className="line-mask">
                <motion.span className="block" variants={{ enter: { y: "110%" }, present: { y: "0%", transition: { duration: 1, ease: easeDrawn, delay: 0.1 + index * 0.07 } }, exit: { opacity: 0 } }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h2>
          <SourceLine delay={1.2}>Problem statement in the brief&apos;s template. We do not claim Leaf Doctor raises yield; no study has tested it.</SourceLine>
        </CopyColumn>
      ) : (
        <CopyColumn side={side}>
          <Headline lines={["We know because"]} />
          <BecauseList />
        </CopyColumn>
      )}
    </StepSwap>
  );
}
