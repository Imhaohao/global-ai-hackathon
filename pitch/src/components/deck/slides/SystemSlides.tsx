"use client";

import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { facts } from "@/lib/facts";
import { easeDrawn } from "@/lib/motion";
import { copy } from "@/lib/productCopy";
import { SmsFlow, type FlowFocus } from "../SmsFlow";
import { fadeReveal } from "../primitives";
import type { SlideProps } from "../slides";
import { BuildStateChip, CopyColumn, emulatorNote, Headline, Lede, ScreensLayout } from "./parts";
import { StepSwap } from "./StorySlides";

function Quote({ original, english, delay = 0.7 }: { original: string; english: string; delay?: number }) {
  return (
    <motion.figure variants={fadeReveal(delay, 10)} className="flex max-w-[44ch] flex-col gap-2">
      <blockquote lang="sw" className="text-body font-semibold text-ink">
        &ldquo;{original}&rdquo;
      </blockquote>
      <figcaption className="text-caption text-ink-muted">{english}</figcaption>
    </motion.figure>
  );
}

const smsSteps: { focus: FlowFocus; lines: string[]; body: ReactNode | null; source?: string; state?: "built" | "emulator" }[] = [
  {
    focus: "sent",
    lines: ["A flip phone", "is enough."],
    body: <Quote original={copy.farmerMessage} english="Leaves have yellow spots and orange powder under the leaf. (An example message.)" />,
    source: "Noor texts the Leaf Doctor number, which reaches a hub phone at the local officer's station or cooperative.",
    state: "built",
  },
  {
    focus: "offline",
    lines: ["The hub answers", "with no signal."],
    body: null,
    source: `The on-device model only fills in fields; rules choose the disease. ${facts.hubEmulatorSeconds.display} per text on an Android emulator, not yet on a real phone.`,
    state: "emulator",
  },
  {
    focus: "reply",
    lines: ["The reply asks her", "to confirm."],
    body: <Quote original={copy.confirmFirstSwahili} english={copy.confirmFirstEnglish} delay={0.5} />,
    source: "Reply text: SWAHILI_WORDING.confirmFirst in shared/src/smsReply.ts. Swahili wording still needs a native speaker's review.",
  },
  {
    focus: "photo",
    lines: ["With signal,", "a photo works too."],
    body: null,
    source: "A phone that sends MMS can text a leaf photo. Claude reads it on the online backend (/ask-image), so photos need a connection and never work offline over SMS. With signal, the hub can also hand texts to the backend.",
    state: "built",
  },
];

export function SmsSlide({ step }: SlideProps) {
  const current = smsSteps[Math.min(step, smsSteps.length - 1)];
  const side = current.focus === "offline" || current.focus === "photo" ? "left" : "right";
  return (
    <StepSwap step={step}>
      <CopyColumn side={side} source={current.source}>
        <Headline lines={current.lines} />
        {current.body ?? <SmsFlow focus={current.focus} />}
        {current.state && <BuildStateChip state={current.state} delay={1.1} />}
      </CopyColumn>
    </StepSwap>
  );
}

type Reading = { leaf: number; label: string; confidence: "confident" | "possible" | "unclear" };

const readings: Reading[] = [
  { leaf: 1, label: "Rust", confidence: "confident" },
  { leaf: 2, label: "Rust", confidence: "confident" },
  { leaf: 3, label: "Leaf hidden", confidence: "unclear" },
  { leaf: 4, label: "Rust", confidence: "confident" },
  { leaf: 5, label: "Rust", confidence: "possible" },
  { leaf: 6, label: "Rust", confidence: "confident" },
];

const confidenceStyle: Record<Reading["confidence"], { chip: string; text: string; word: string }> = {
  confident: { chip: "bg-confident-soft", text: "text-confident", word: "Confident" },
  possible: { chip: "bg-possible-soft", text: "text-possible", word: "Possible" },
  unclear: { chip: "bg-unclear-soft", text: "text-unclear", word: "Unclear" },
};

function LeafCard({ reading, index, showReading }: { reading: Reading; index: number; showReading: boolean }) {
  const style = confidenceStyle[reading.confidence];
  return (
    <motion.li
      variants={{ enter: { opacity: 0, y: 24, rotate: -2 }, present: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.8, ease: easeDrawn, delay: 0.3 + index * 0.12 } }, exit: { opacity: 0 } }}
      className="flex flex-col gap-2 rounded-md bg-paper-raised p-2 surface-raised"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/stage/leaves/leaf-${reading.leaf}.png`} alt={`Photo ${reading.leaf} of six: a coffee leaf${reading.confidence === "unclear" ? " half hidden behind a branch" : " with orange rust spots"}`} className="aspect-square w-full rounded-sm object-cover" />
      {showReading && (
        <motion.p variants={fadeReveal(0.2 + index * 0.12)} className={`flex items-center justify-between rounded-sm px-2 py-1 text-caption ${style.chip}`}>
          <span className="font-bold text-ink">{reading.label}</span>
          <span className={`font-semibold ${style.text}`}>{style.word}</span>
        </motion.p>
      )}
    </motion.li>
  );
}

function SixLeaves({ showReading }: { showReading: boolean }) {
  return (
    <ol className="grid w-deck-panel grid-cols-3 gap-3">
      {readings.map((reading, index) => (
        <LeafCard key={reading.leaf} reading={reading} index={index} showReading={showReading} />
      ))}
    </ol>
  );
}

export function ScanSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step < 2 ? (
        <CopyColumn side="right" source={step === 1 ? "Leaf photos are renders of the stage's six rust leaves. Readings are an example, not a test result." : undefined}>
          <Headline lines={step === 0 ? ["At the weekend, her", "daughter scans", "six leaves."] : ["Each leaf gets", "its own reading."]} />
          {step === 0 && <Lede>The family smartphone runs a 7.7 MB leaf model offline, one photo per leaf.</Lede>}
          <SixLeaves showReading={step === 1} />
          {step === 0 && <BuildStateChip state="emulator" delay={1.2} />}
        </CopyColumn>
      ) : (
        <ScreensLayout
          lines={["Then one card", "says what to do."]}
          lede="When at least three clear leaves agree, the card names the disease, lists cheap steps first and sets a date to check again."
          state="emulator"
          screens={[
            { name: "03-three-leaves-agree", alt: "App screen: Check one coffee tree, three photos taken, 3 of 3 clear leaves agree." },
            { name: "04-action-card-after-clear-plant", alt: "Action card: Coffee leaf rust, clean up and prune, five numbered steps, check again on Sat 10 Oct." },
          ]}
        />
      )}
    </StepSwap>
  );
}

export function PersonSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <ScreensLayout
          lines={["Not sure means", "a person looks."]}
          lede="When the leaves disagree or are too unclear, the app stops guessing and offers to send the case to her field officer."
          state="emulator"
          screens={[{ name: "07-action-card-needs-person", alt: "Action card: The app is not sure. Show these leaves to your field officer. Send to field officer button." }]}
        />
      ) : (
        <ScreensLayout
          lines={["The officer gets", "the case by SMS."]}
          lede="One tap opens her messages app with the case already written: date, result and how many leaves were clear. It goes as a plain SMS, so it needs no data."
          state="emulator"
          note={`${emulatorNote} The empty message history is cropped out of this one.`}
          screens={[{ name: "08-sms-opens-with-case-summary", alt: "Messages app with a drafted SMS: Leaf Doctor case, 2026-10-03, result not sure, leaves disagree, 3 of 3 leaves clear." }]}
        />
      )}
    </StepSwap>
  );
}

type Guardrail = { title: string; rule: string; evidence: ReactNode };

const guardrails: Guardrail[] = [
  {
    title: "Confirm first",
    rule: "The model never finalises a diagnosis. Every model-assisted answer asks Noor what she sees.",
    evidence: (
      <span lang="sw">
        Huenda ni Kutu ya majani ya kahawa. ... <mark className="highlight-rust bg-transparent text-ink">Jibu ukieleza unachoona ili tuhakikishe.</mark>
      </span>
    ),
  },
  {
    title: "Approved Swahili only",
    rule: "Swahili sent to farmers comes from a fixed, written text set. Model-written Swahili failed our test at both model sizes.",
    evidence: <span className="font-data text-caption">phraseVerdictInSwahili: not wired to any farmer path</span>,
  },
  {
    title: "Unsure goes to a person",
    rule: "Low-confidence or unclear results are marked for a person, and a case summary goes to the field officer.",
    evidence: <span className="font-data text-caption">needsPerson: true, decision: &quot;callOfficer&quot;</span>,
  },
  {
    title: "No invented doses",
    rule: "Cheap, non-chemical steps come first. A spray step quotes the product label, never a number we made up.",
    evidence: (
      <span>
        ...does not cure sick ones. <mark className="highlight-rust bg-transparent text-ink">Use the rate on the product label.</mark>
      </span>
    ),
  },
];

export function GuardrailsSlide() {
  return (
    <div className="deck-gutter relative flex h-full flex-col justify-center gap-deck-rise">
      <motion.div aria-hidden variants={fadeReveal(0)} className="paper-wash-full pointer-events-none absolute inset-0" />
      <div className="relative">
        <Headline lines={["Four rules the model cannot break"]} />
      </div>
      <ul className="relative grid grid-cols-2 gap-deck-gap">
        {guardrails.map((guardrail, index) => (
          <motion.li key={guardrail.title} variants={fadeReveal(0.4 + index * 0.15, 16)} className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-lede font-bold text-ink">
              <CheckCircle weight="fill" className="icon-em text-leaf" />
              {guardrail.title}
            </p>
            <p className="max-w-[48ch] text-body text-ink-muted">{guardrail.rule}</p>
            <p className="flex items-start gap-2 rounded-md bg-paper-raised px-3 py-2 text-caption text-ink">
              <ArrowRight className="icon-em mt-[0.2em] text-ink-faint" />
              {guardrail.evidence}
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
