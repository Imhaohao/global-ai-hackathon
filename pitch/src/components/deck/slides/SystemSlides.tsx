"use client";

import { ArrowRight, CheckCircle, PaperPlaneTilt, Phone, Question, WarningOctagon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { facts } from "@/lib/facts";
import { easeDrawn } from "@/lib/motion";
import { copy } from "@/lib/productCopy";
import { SmsFlow, type FlowFocus } from "../SmsFlow";
import { fadeReveal } from "../primitives";
import type { SlideProps } from "../slides";
import { BuildStateChip, CopyColumn, Headline, Lede } from "./parts";
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

const smsSteps: { focus: FlowFocus; lines: string[]; body: ReactNode | null; source?: string }[] = [
  {
    focus: "sent",
    lines: ["Noor texts the", "cooperative's number."],
    body: <Quote original={copy.farmerMessage} english="Leaves have yellow spots and orange powder under the leaf. (An example message.)" />,
  },
  {
    focus: "online",
    lines: ["A phone at the", "cooperative answers."],
    body: null,
    source: "With signal, the hub forwards the text to the backend; Claude may only draft from the disease list in shared/src/diseases.ts.",
  },
  {
    focus: "offline",
    lines: ["No signal, still", "an answer."],
    body: null,
    source: `The 2-billion-parameter model only fills in fields; rules choose the disease. ${facts.hubEmulatorSeconds.display} per text, measured on an Android emulator, not yet on a real phone.`,
  },
  {
    focus: "reply",
    lines: ["The reply asks her", "to confirm."],
    body: <Quote original={copy.confirmFirstSwahili} english={copy.confirmFirstEnglish} delay={0.5} />,
    source: "Reply text: SWAHILI_WORDING.confirmFirst in shared/src/smsReply.ts. Swahili wording still needs a native speaker's review.",
  },
];

export function SmsSlide({ step }: SlideProps) {
  const current = smsSteps[Math.min(step, smsSteps.length - 1)];
  const side = current.focus === "online" || current.focus === "offline" ? "left" : "right";
  return (
    <StepSwap step={step}>
      <CopyColumn side={side} source={current.source}>
        <Headline lines={current.lines} />
        {current.body ?? <SmsFlow focus={current.focus} />}
        {step === 0 && <BuildStateChip state="built" delay={1.1} />}
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

function ActionCardMock() {
  return (
    <motion.div
      variants={{ enter: { opacity: 0, y: 40 }, present: { opacity: 1, y: 0, transition: { duration: 0.9, ease: easeDrawn, delay: 0.3 } }, exit: { opacity: 0 } }}
      className="flex w-deck-card flex-col gap-2 rounded-phone bg-paper-raised p-5 surface-raised"
      aria-label="Action card mockup"
    >
      <p className="flex items-center gap-2 self-start rounded-full bg-unclear-soft px-3 py-1 text-caption font-semibold text-unclear">
        <WarningOctagon weight="fill" className="icon-em" />
        Act soon
      </p>
      <p className="display-headline text-lede text-ink">{copy.card.headline}</p>
      <p className="rounded-md bg-leaf-soft px-3 py-2 text-fineprint text-ink">{copy.card.rainLine}</p>
      <ol className="flex flex-col gap-2">
        {copy.card.firstSteps.map((stepText, index) => (
          <li key={stepText} className="grid grid-cols-[1.6em_1fr] gap-2 text-fineprint text-ink">
            <span className="flex aspect-square items-center justify-center rounded-full bg-leaf font-bold text-on-leaf">{index + 1}</span>
            <span>{stepText}</span>
          </li>
        ))}
      </ol>
      <p className="text-fineprint text-ink-muted">3 more steps, then check again in 7 days.</p>
      <p className="flex items-center justify-center gap-2 rounded-md bg-leaf px-3 py-2 text-caption font-semibold text-on-leaf">
        <Phone weight="bold" className="icon-em" />
        Call your field officer
      </p>
    </motion.div>
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
          {step === 0 && <BuildStateChip state="inProgress" delay={1.2} />}
        </CopyColumn>
      ) : (
        <CopyColumn side="right" source="Card text is buildActionCard output in shared/src/actionCard.ts for a rust result with 4 wet days in the last 7.">
          <Headline lines={["Then one card", "says what to do."]} />
          <ActionCardMock />
        </CopyColumn>
      )}
    </StepSwap>
  );
}

function CaseRows() {
  return (
    <dl className="grid w-deck-column grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body">
      {copy.caseFields.map(([key, value], index) => (
        <motion.div key={key} variants={fadeReveal(0.4 + index * 0.1, 8)} className="contents">
          <dt className="text-ink-muted">{key}</dt>
          <dd className="figures-tabular text-ink">{value}</dd>
        </motion.div>
      ))}
    </dl>
  );
}

function UnsureCard() {
  return (
    <motion.div variants={fadeReveal(0.5, 20)} className="flex w-deck-card flex-col gap-3 rounded-phone bg-paper-raised p-5 surface-raised">
      <p className="flex items-center gap-2 self-start rounded-full bg-possible-soft px-3 py-1 text-caption font-semibold text-possible">
        <Question weight="bold" className="icon-em" />
        Not sure
      </p>
      <p className="display-headline text-lede text-ink">{copy.unsure.headline}</p>
      <p className="text-caption text-ink-muted">{copy.unsure.doNow}</p>
      <motion.p
        className="flex items-center justify-center gap-2 rounded-md bg-leaf px-3 py-2 text-caption font-semibold text-on-leaf"
        variants={{ enter: { scale: 1 }, present: { scale: [1, 1, 0.96, 1], transition: { duration: 0.5, times: [0, 0.6, 0.8, 1], delay: 1.6 } }, exit: { opacity: 0 } }}
      >
        <PaperPlaneTilt weight="bold" className="icon-em" />
        Send to the field officer
      </motion.p>
    </motion.div>
  );
}

export function PersonSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="right">
          <Headline lines={["Not sure means", "a person looks."]} />
          <UnsureCard />
        </CopyColumn>
      ) : (
        <CopyColumn side="right" source="Example case. Text from formatCaseSummarySms in shared/src/caseSummary.ts; rain from NASA POWER daily data.">
          <Headline lines={["The officer gets", "the case by SMS."]} />
          <CaseRows />
          <BuildStateChip state="inProgress" delay={1.4} />
        </CopyColumn>
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
