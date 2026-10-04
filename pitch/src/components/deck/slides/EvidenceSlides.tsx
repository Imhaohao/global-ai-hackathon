"use client";

import { AddressBook, BatteryWarning, Cpu, EyeSlash, Ruler, Translate, type Icon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { facts, sourceLine } from "@/lib/facts";
import { easeDrawn } from "@/lib/motion";
import { CountUp, fadeReveal } from "../primitives";
import type { SlideProps } from "../slides";
import { BuildStateChip, CopyColumn, Headline, Lede } from "./parts";
import { StepSwap } from "./StorySlides";

type Outcome = "right" | "confirmRight" | "unsure" | "confirmWrong" | "wrong";

const outcomeStyle: Record<Outcome, { label: string; fill: string; text: string }> = {
  right: { label: "Right", fill: "bg-leaf", text: "text-on-leaf" },
  confirmRight: { label: "Right after confirming", fill: "bg-leaf/55", text: "text-ink" },
  unsure: { label: "Unsure, asks again", fill: "hatch-ink", text: "text-ink" },
  confirmWrong: { label: "Wrong guess, caught by confirming", fill: "bg-possible-soft", text: "text-possible" },
  wrong: { label: "Wrong final answer", fill: "bg-unclear", text: "text-on-leaf" },
};

const outcomeOrder: Outcome[] = ["right", "confirmRight", "unsure", "confirmWrong", "wrong"];

const runs: { name: string; fields: string; counts: Record<Outcome, number> }[] = [
  { name: "Keyword rules on raw text", fields: "no model", counts: { right: 3, confirmRight: 0, unsure: 10, confirmWrong: 0, wrong: 0 } },
  { name: "Qwen3.5-0.8B", fields: "77 of 94 fields", counts: { right: 3, confirmRight: 4, unsure: 3, confirmWrong: 3, wrong: 0 } },
  { name: "Qwen3.5-2B, shipped", fields: "84 of 94 fields", counts: { right: 3, confirmRight: 7, unsure: 2, confirmWrong: 1, wrong: 0 } },
];

const CASES = 13;

function OutcomeBars() {
  return (
    <div className="flex w-deck-column flex-col gap-deck-hairline">
      {runs.map((run, runIndex) => (
        <div key={run.name} className="flex flex-col gap-1">
          <p className="flex justify-between text-caption">
            <span className="font-bold text-ink">{run.name}</span>
            <span className="figures-tabular text-ink-muted">{run.fields}</span>
          </p>
          <div role="img" aria-label={`${run.name}: ${outcomeOrder.map((key) => `${run.counts[key]} ${outcomeStyle[key].label.toLowerCase()}`).join(", ")}`} className="flex h-deck-bar w-full gap-[2px]">
            {outcomeOrder.filter((key) => run.counts[key] > 0).map((key, index) => (
              <motion.span
                key={key}
                variants={{ enter: { scaleX: 0 }, present: { scaleX: 1, transition: { duration: 0.8, ease: easeDrawn, delay: 0.4 + runIndex * 0.3 + index * 0.08 } }, exit: { opacity: 0 } }}
                style={{ width: `${(run.counts[key] / CASES) * 100}%`, originX: 0 }}
                className={`flex items-center justify-center text-caption font-bold figures-tabular ${outcomeStyle[key].fill} ${outcomeStyle[key].text}`}
              >
                {run.counts[key]}
              </motion.span>
            ))}
          </div>
        </div>
      ))}
      <motion.ul variants={fadeReveal(1.6)} className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-fineprint text-ink-muted">
        {outcomeOrder.map((key) => (
          <li key={key} className="flex items-center gap-1.5">
            <span aria-hidden className={`inline-block size-3 ${outcomeStyle[key].fill}`} />
            {outcomeStyle[key].label}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

const acceptedCorrect = (facts.leafAccepted.value * facts.leafAcceptedCorrect.value) / 100;
const acceptedWrong = facts.leafAccepted.value - acceptedCorrect;
const rejected = 100 - facts.leafAccepted.value;

const leafSegments = [
  { key: "correct", share: acceptedCorrect, label: "Answered and right", fill: "bg-leaf" },
  { key: "wrong", share: acceptedWrong, label: "Answered and wrong", fill: "bg-unclear" },
  { key: "held", share: rejected, label: "Held back as unclear", fill: "hatch-ink" },
];

const placedLeafSegments = leafSegments.map((segment, index) => ({
  ...segment,
  left: leafSegments.slice(0, index).reduce((sum, previous) => sum + previous.share, 0),
}));

function LeafModelBar() {
  return (
    <div className="flex w-deck-column flex-col gap-deck-hairline">
      <div role="img" aria-label="Of 4,571 test images: 75.9% answered and right, 5.6% answered and wrong, 18.5% held back as unclear" className="relative h-deck-bar w-full">
        {placedLeafSegments.map((segment, index) => {
          const style = { left: `${segment.left}%`, width: `${segment.share}%`, originX: 0 };
          return (
            <motion.span
              key={segment.key}
              variants={{ enter: { scaleX: 0 }, present: { scaleX: 1, transition: { duration: 0.9, ease: easeDrawn, delay: 0.6 + index * 0.3 } }, exit: { opacity: 0 } }}
              style={style}
              className={`absolute inset-y-0 ${segment.fill}`}
            />
          );
        })}
      </div>
      <ul className="flex justify-between text-caption">
        {leafSegments.map((segment, index) => (
          <motion.li key={segment.key} variants={fadeReveal(1 + index * 0.3)} className="flex flex-col">
            <span className="figures-tabular font-bold text-ink">{segment.share.toFixed(1)}%</span>
            <span className="text-ink-muted">{segment.label}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

const vlmBars = [
  { label: "General model, no training on the crop", detail: "zero-shot Gemini 2.5 Pro", value: facts.zeroShotBanana.value, fill: "bg-ink-faint" },
  { label: "Model fine-tuned on the crop", detail: "same test, in-domain", value: facts.fineTunedBanana.value, fill: "bg-leaf" },
];

function VlmBars() {
  return (
    <div className="flex w-deck-column flex-col gap-deck-rise">
      {vlmBars.map((bar, index) => (
        <div key={bar.label} className="flex flex-col gap-2">
          <p className="flex items-baseline justify-between gap-4 text-body">
            <span className="text-ink">{bar.label}</span>
            <span className="display-headline text-lede text-ink">
              <CountUp to={bar.value} decimals={2} suffix="%" delay={0.5 + index * 0.4} />
            </span>
          </p>
          <div className="h-deck-bar w-full bg-paper-sunken">
            <motion.div
              variants={{ enter: { scaleX: 0 }, present: { scaleX: 1, transition: { duration: 1.4, ease: easeDrawn, delay: 0.5 + index * 0.4 } }, exit: { opacity: 0 } }}
              style={{ width: `${bar.value}%`, originX: 0 }}
              className={`h-full ${bar.fill}`}
            />
          </div>
          <p className="text-caption text-ink-muted">{bar.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function EvidenceSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 && (
        <CopyColumn side="right" source="PROGRESS.md, 3 Oct 2026: 24 synthetic Swahili and English texts, 13 of which name a leaf condition. Temperature 0, confirm-first on.">
          <Headline lines={["Our text test had no", "wrong final diagnosis."]} />
          <OutcomeBars />
        </CopyColumn>
      )}
      {step === 1 && (
        <CopyColumn side="right" source={`${sourceLine("leafRawAccuracy")}. Dataset results, not field accuracy.`}>
          <Headline lines={["The leaf model holds", "back what it can't read."]} />
          <Lede delay={0.4}>
            On 4,571 held-out test images it was right <span className="font-bold text-ink">{facts.leafRawAccuracy.display}</span> of the time. Its confidence rules answered {facts.leafAccepted.display} of images, and {facts.leafAcceptedCorrect.display} of those answers were right.
          </Lede>
          <LeafModelBar />
        </CopyColumn>
      )}
      {step === 2 && (
        <CopyColumn side="right" source={`${sourceLine("zeroShotBanana")}. Out-of-domain, the fine-tuned model scored 83.28%.`}>
          <Headline lines={["Why not ask a", "general model?"]} />
          <Lede delay={0.3}>On banana disease, a general model guessed right less than half the time. So we cut zero-shot diagnosis.</Lede>
          <VlmBars />
        </CopyColumn>
      )}
    </StepSwap>
  );
}

export function MapSlide() {
  return (
    <CopyColumn side="left">
      <Headline lines={["Reports become", "the cooperative's", "rust map."]} />
      <Lede>Every consented report carries a time, a place and a farm section. Plotted together, they show where rust is moving.</Lede>
      <BuildStateChip state="next" delay={1.2} />
    </CopyColumn>
  );
}

const timelineStart = Date.UTC(2025, 8, 1);
const timelineEnd = Date.UTC(2027, 7, 1);

type Milestone = { date: number; label: string; detail: string; marker: "past" | "today" | "deadline" };

const milestones: Milestone[] = [
  { date: Date.UTC(2025, 8, 15), label: "Sep 2025", detail: "Kenya's coffee geo-mapping 30% done, 16 of 33 counties", marker: "past" },
  { date: Date.UTC(2026, 9, 3), label: "Today", detail: "", marker: "today" },
  { date: Date.UTC(2026, 11, 30), label: "30 Dec 2026", detail: "EU deforestation rule applies to large and medium operators", marker: "deadline" },
  { date: Date.UTC(2027, 5, 30), label: "30 Jun 2027", detail: "and to micro and small operators", marker: "deadline" },
];

const markerClass: Record<Milestone["marker"], string> = {
  past: "bg-ink-faint",
  today: "bg-ink",
  deadline: "rust-mark",
};

function position(date: number) {
  return ((date - timelineStart) / (timelineEnd - timelineStart)) * 100;
}

function Timeline() {
  return (
    <div className="relative h-deck-timeline w-deck-column">
      <motion.div
        aria-hidden
        variants={{ enter: { scaleX: 0 }, present: { scaleX: 1, transition: { duration: 1.2, ease: easeDrawn, delay: 0.4 } }, exit: { opacity: 0 } }}
        style={{ originX: 0 }}
        className="absolute inset-x-0 top-deck-marker-centre h-0.5 bg-ink"
      />
      {milestones.map((milestone, index) => (
        <motion.div key={milestone.label} variants={fadeReveal(0.7 + index * 0.25, 8)} style={{ left: `${position(milestone.date)}%` }} className={`absolute top-0 flex flex-col gap-1 ${index % 2 === 1 ? "translate-y-deck-stagger" : ""} ${index === milestones.length - 1 ? "-translate-x-full items-end text-end" : ""}`}>
          <span aria-hidden className={`size-deck-marker rounded-full ${markerClass[milestone.marker]}`} />
          <span className="whitespace-nowrap text-caption font-bold text-ink">{milestone.label}</span>
          {milestone.detail && <span className="max-w-[18ch] text-fineprint text-ink-muted">{milestone.detail}</span>}
        </motion.div>
      ))}
    </div>
  );
}

export function RegistrySlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="right" source={sourceLine("kenyaGeoMapping", "eudrLarge", "faoMappingCost")}>
          <Headline lines={["A consented registry", "serves two needs."]} />
          <Lede delay={0.3}>Plot GPS that routes disease alerts is also what the EU deforestation rule asks coffee buyers for. FAO mapped 19 societies for about $0.30 a farmer.</Lede>
          <Timeline />
          <BuildStateChip state="next" delay={1.8} />
        </CopyColumn>
      ) : (
        <CopyColumn side="right" source={`${facts.othayaPopulation.source} (${facts.othayaPopulation.year}). Total population, not farmers.`}>
          <Headline lines={["A new crop is a", "new list, not a", "new system."]} />
          <Lede delay={0.3}>Another crop or country needs its own disease list, wording, contacts and test set. The SMS path&apos;s model files stay the same.</Lede>
          <motion.p variants={fadeReveal(0.9, 10)} className="flex items-baseline gap-4">
            <span className="display-headline text-figure text-ink">
              <CountUp to={facts.othayaPopulation.value} delay={1} />
            </span>
            <span className="max-w-[22ch] text-body text-ink-muted">people live within 10 km of Othaya, a coffee town in Nyeri, where one hub phone would sit.</span>
          </motion.p>
        </CopyColumn>
      )}
    </StepSwap>
  );
}

type Limit = { icon: Icon; text: string; unmeasured: boolean };

const limits: Limit[] = [
  { icon: EyeSlash, text: "The leaf model cannot see coffee berry disease, berry borer or wilt. Such a leaf comes back unclear, or wrongly confident.", unmeasured: false },
  { icon: Ruler, text: `Field accuracy is unknown. On a separate rust stress set the leaf model scored AUROC ${facts.leafRustStressAuroc.display}, no better than chance, and it has not run on a real phone.`, unmeasured: true },
  { icon: Translate, text: "Kikuyu, likely Noor's home language, is untested. The Swahili wording still needs a native speaker's review.", unmeasured: true },
  { icon: BatteryWarning, text: "The hub phone belongs to the cooperative. If it is off or out of credit, Noor gets no answer.", unmeasured: false },
  { icon: Cpu, text: "The 2B model needs about 4 GB of RAM, and its speed on a real phone is unmeasured. Phones with 2 GB fall back to keyword rules.", unmeasured: true },
  { icon: AddressBook, text: "The verified contact list must be rechecked by a person before anyone relies on it.", unmeasured: false },
];

export function LimitsSlide() {
  return (
    <div className="deck-gutter relative flex h-full flex-col justify-center gap-deck-rise">
      <motion.div aria-hidden variants={fadeReveal(0)} className="paper-wash-full pointer-events-none absolute inset-0" />
      <div className="relative">
        <Headline lines={["What it cannot do yet"]} />
      </div>
      <ul className="relative grid grid-cols-2 gap-x-deck-gap gap-y-deck-rise">
        {limits.map((limit, index) => (
          <motion.li key={limit.text} variants={fadeReveal(0.35 + index * 0.12, 12)} className="grid grid-cols-[auto_1fr] items-start gap-4">
            <span className={`flex size-deck-icon items-center justify-center rounded-md ${limit.unmeasured ? "not-measured-hatch bg-paper-raised" : "bg-paper-raised"}`}>
              <limit.icon className="size-1/2 text-ink" weight="regular" />
            </span>
            <p className="max-w-[46ch] text-body text-ink">{limit.text}</p>
          </motion.li>
        ))}
      </ul>
      <motion.p variants={fadeReveal(1.3)} className="relative flex items-center gap-2 text-caption text-ink-muted">
        <span aria-hidden className="not-measured-hatch inline-block size-4 rounded-sm ring-1 ring-ink-faint" />
        Hatched: not measured yet. We will publish these numbers as we find them, even if they are worse than hoped.
      </motion.p>
    </div>
  );
}
