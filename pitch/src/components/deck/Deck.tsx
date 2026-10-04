"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { SlopeStage } from "@/components/stage/SlopeStage";
import { exitTransition } from "@/lib/motion";
import { shotFor, slides, type SlideLayer } from "./slides";
import { useDeckNavigation } from "./useDeckNavigation";
import { useFullscreenShortcut, useIdleCursor } from "./usePresenterChrome";

const layerClassName: Record<SlideLayer, string> = {
  behindStage: "z-0",
  overStage: "z-20",
};

const slideStepCounts = slides.map((slide) => slide.shots.length);

const slideFrame: Variants = {
  exit: { opacity: 0, transition: exitTransition },
};

function SlideFrame({ layer, label, children }: { layer: SlideLayer; label: string; children: ReactNode }) {
  return (
    <motion.section
      aria-label={label}
      className={`absolute inset-0 ${layerClassName[layer]}`}
      variants={slideFrame}
      initial="enter"
      animate="present"
      exit="exit"
    >
      {children}
    </motion.section>
  );
}

export function Deck() {
  const { index, step, direction, advance, handlePointerDown, handlePointerUp, handleContextMenu } = useDeckNavigation(slideStepCounts);
  const cursorIsIdle = useIdleCursor();
  const reducedMotion = useReducedMotion() ?? false;
  useFullscreenShortcut();

  const slide = slides[index];

  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`fixed inset-0 overflow-hidden bg-paper text-ink select-none ${cursorIsIdle ? "cursor-none" : "cursor-default"}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      >
        <SlopeStage shot={shotFor(slide, step)} still={reducedMotion} />
        <AnimatePresence mode="wait">
          <SlideFrame key={slide.id} layer={slide.layer} label={`${slide.title}, slide ${index + 1} of ${slides.length}`}>
            <slide.Content step={step} direction={direction} advance={advance} />
          </SlideFrame>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {slide.Foreground && (
            <SlideFrame key={`${slide.id}-foreground-${step}`} layer="overStage" label={`${slide.title}, notes`}>
              <slide.Foreground step={step} direction={direction} advance={advance} />
            </SlideFrame>
          )}
        </AnimatePresence>
        <div aria-hidden className="vignette pointer-events-none absolute inset-0 z-30" />
        <div aria-hidden className="paper-grain pointer-events-none absolute inset-0 z-30" />
      </main>
    </MotionConfig>
  );
}
