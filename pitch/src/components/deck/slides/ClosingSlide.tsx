"use client";

import credits from "@assets/stage/credits.json";
import { motion } from "motion/react";
import { facts, type FactKey } from "@/lib/facts";
import { fadeReveal, MaskedLines } from "../primitives";
import type { SlideProps } from "../slides";
import { PosterTitle } from "./TitleSlide";

export function ClosingSlide({ step }: SlideProps) {
  return (
    <motion.div className="h-full" initial={false} animate={{ opacity: step > 0 ? 0 : 1 }} transition={{ duration: 0.5 }}>
      <PosterTitle text="Leaf Doctor" />
    </motion.div>
  );
}

const dataSources: FactKey[] = ["ruralDailyInternet", "ruralElectricity", "ruralBasicPhoneMain", "extensionTarget", "nuruField", "phoneAdviceYield", "zeroShotBanana", "eudrLarge", "faoMappingCost", "kenyaGeoMapping", "othayaPopulation"];

function Credits() {
  return (
    <motion.div variants={fadeReveal(0.1)} className="paper-wash-full deck-gutter absolute inset-0 grid grid-cols-2 content-center gap-deck-gap">
      <section className="flex flex-col gap-2">
        <h2 className="display-headline text-lede text-ink">Images and type</h2>
        <p className="text-caption text-ink-muted">{credits.note}</p>
        <ul className="flex flex-col gap-1 text-fineprint text-ink">
          {credits.assets.map((asset) => (
            <li key={asset.name}>
              <span className="font-bold">{asset.name}</span>, {asset.authors}, {asset.licence}. {asset.use}.
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="display-headline text-lede text-ink">Data</h2>
        <ul className="flex flex-col gap-1 text-fineprint text-ink">
          {dataSources.map((key) => (
            <li key={key}>
              {facts[key].source} ({facts[key].year}). <span className="text-ink-muted">{facts[key].url}</span>
            </li>
          ))}
        </ul>
        <p className="text-fineprint text-ink-muted">Product figures come from this repository: PROGRESS.md, README.md and the shared/ code. Phone screens on the 3D stage are mockups drawn from hub/ and shared/ code. App screens on slides are Android emulator screenshots from docs/screens.</p>
      </section>
    </motion.div>
  );
}

export function ClosingForeground({ step }: SlideProps) {
  if (step > 0) return <Credits />;
  return (
    <div className="deck-gutter relative flex h-full items-end">
      <motion.div aria-hidden variants={fadeReveal(1)} className="paper-wash-low pointer-events-none absolute inset-0" />
      <p className="display-headline relative text-lede text-ink">
        <MaskedLines lines={["A small model works where", "she farms, and a person", "is one text away."]} delay={1.4} />
      </p>
    </div>
  );
}
