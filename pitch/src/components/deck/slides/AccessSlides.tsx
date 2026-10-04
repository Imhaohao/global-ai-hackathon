"use client";

import { motion } from "motion/react";
import { facts, sourceLine } from "@/lib/facts";
import { easeDrawn } from "@/lib/motion";
import { AccessGap } from "../AccessGap";
import { CloudVsDevice } from "../CloudVsDevice";
import { CountUp, fadeReveal } from "../primitives";
import type { SlideProps } from "../slides";
import { VlmBars } from "./EvidenceSlides";
import { BuildStateChip, CopyColumn, Headline, Lede, ScreensLayout } from "./parts";
import { Figure, OfficerField, PhoneBar, StepSwap } from "./StorySlides";

export function GapSlide() {
  return (
    <CopyColumn side="right" source="Kinds of help that exist today. The two walls are the barriers this deck is about.">
      <Headline lines={["Crop disease has fixes.", "They stop short", "of the slope."]} />
      <AccessGap />
    </CopyColumn>
  );
}

export function InternetSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="right" source={sourceLine("ruralDailyInternet", "ruralElectricity")}>
          <Headline lines={["Barrier one:", "the slope is", "mostly offline."]} />
          <div className="flex gap-deck-gap">
            <Figure value={facts.ruralDailyInternet.value} decimals={1} suffix="%" label="of rural adults go online every day (2024)" delay={0.5} />
            <Figure value={facts.ruralElectricity.value} decimals={1} suffix="%" label="of rural people have electricity at home (2024)" delay={0.7} />
          </div>
        </CopyColumn>
      ) : (
        <CopyColumn side="right" source={`${facts.ruralBasicPhoneMain.source} (${facts.ruralBasicPhoneMain.year}). Bar shows each rural adult's main phone.`}>
          <Headline lines={["About four in ten", "rural adults text", "on a basic phone."]} />
          <PhoneBar />
          <Lede delay={1.8}>A basic phone has SMS and no apps, so help has to arrive as a text.</Lede>
        </CopyColumn>
      )}
    </StepSwap>
  );
}

export function LocalSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="left" source={`${facts.extensionTarget.source}. Quoted: "the ratio of extension staff to farmer has not improved."`}>
          <Headline lines={["Barrier two: advice", "has to fit locally."]} />
          <Lede delay={0.3}>A remedy is only useful in her language, for her crop, with a person nearby to call. That person is scarce: Kenya aims for one officer per 600 farmers by 2029.</Lede>
          <OfficerField />
        </CopyColumn>
      ) : (
        <CopyColumn side="left" source={`${sourceLine("zeroShotBanana")}. On images unlike its training data, the fine-tuned model scored 83.28%.`}>
          <Headline lines={["A general model", "misreads a local crop."]} />
          <Lede delay={0.3}>On banana leaf disease, a general model was right less than half the time. A model trained on the crop got it right nine times in ten.</Lede>
          <VlmBars />
        </CopyColumn>
      )}
    </StepSwap>
  );
}

function SizeFigure({ value, decimals, unit, label, delay }: { value: number; decimals: number; unit: string; label: string; delay: number }) {
  return (
    <motion.p variants={fadeReveal(delay, 10)} className="flex flex-col gap-deck-hairline">
      <span className="display-headline whitespace-nowrap text-figure text-ink">
        <CountUp to={value} decimals={decimals} suffix={` ${unit}`} delay={delay + 0.2} />
      </span>
      <span className="max-w-[24ch] text-body text-ink-muted">{label}</span>
    </motion.p>
  );
}

export function SmallModelSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="right" source={`${facts.leafModelBytes.source}. The model has never run on a physical phone yet.`}>
          <Headline lines={["A model small enough", "to live on her phone."]} />
          <CloudVsDevice sizeLabel={facts.leafModelBytes.display} />
          <BuildStateChip state="emulator" delay={1.4} />
        </CopyColumn>
      ) : (
        <CopyColumn side="left" source={`${facts.hubModelFile.source}. ${facts.hubEmulatorSeconds.source}.`}>
          <Headline lines={["The hub reads", "a text with no signal."]} />
          <Lede delay={0.3}>A 2-billion-parameter language model runs on the hub phone itself and turns her Swahili into fields for the rules.</Lede>
          <div className="flex gap-deck-gap">
            <SizeFigure value={facts.hubModelFile.value} decimals={2} unit="GB" label="model file, kept on the hub phone" delay={0.6} />
            <SizeFigure value={facts.hubEmulatorSeconds.value} decimals={0} unit="s" label="or so per text on an emulator" delay={0.9} />
          </div>
          <BuildStateChip state="emulator" delay={1.4} />
        </CopyColumn>
      )}
    </StepSwap>
  );
}

function GuardBar({ label, caught, total, fill, delay }: { label: string; caught: number; total: number; fill: string; delay: number }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="flex justify-between text-body">
        <span className="text-ink">{label}</span>
        <span className="figures-tabular font-bold text-ink">
          {caught.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
        </span>
      </p>
      <div className="h-deck-bar w-full bg-paper-sunken">
        <motion.div
          variants={{ enter: { scaleX: 0 }, present: { scaleX: 1, transition: { duration: 1.2, ease: easeDrawn, delay } }, exit: { opacity: 0 } }}
          style={{ width: `${(caught / total) * 100}%`, originX: 0 }}
          className={`h-full ${fill}`}
        />
      </div>
    </div>
  );
}

export function LocalFitSlide({ step }: SlideProps) {
  return (
    <StepSwap step={step}>
      {step === 0 ? (
        <CopyColumn side="right" source={`${facts.kikuyuReadAsSwahili.source}. ${facts.kikuyuGuardCaught.source}. News-style sentences, not farmer texts.`}>
          <Headline lines={["Kikuyu goes", "to a person."]} />
          <Lede delay={0.3}>Our hub model mistook Kikuyu for Swahili 97 times in 100. So a word check now runs first, and a Kikuyu text gets a reply asking for Swahili, English or a visit to the officer.</Lede>
          <div className="flex w-deck-column flex-col gap-deck-hairline">
            <GuardBar label="Kikuyu sentences flagged" caught={facts.kikuyuGuardCaught.value} total={1012} fill="bg-leaf" delay={0.8} />
            <GuardBar label="Swahili sentences wrongly flagged" caught={0} total={1012} fill="bg-unclear" delay={1.1} />
          </div>
          <BuildStateChip state="built" delay={1.5} />
        </CopyColumn>
      ) : (
        <ScreensLayout
          lines={["A local number", "that checks seed."]}
          lede={<>The app shows where the KEPHIS code sits on a seed packet and texts it to 1393, Kenya&apos;s free seed check. A text that says SEED gets the same steps.</>}
          state="built"
          screens={[
            { name: "11-seed-check", alt: "App screen: Check a seed packet. Find the KEPHIS sticker, scratch it, text the code to 1393." },
          ]}
        />
      )}
    </StepSwap>
  );
}
