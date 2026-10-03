import { CalendarCheck, CaretDown, CheckCircle, PaperPlaneTilt, Phone, Question, Scissors, WarningOctagon, WifiSlash, type Icon } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { ScanBar } from "../../../components/ScanBar";
import { progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";
import { ScreenButton, ScreenCard, Spotlight } from "./kit";

// Recreated from mobile/src/screens (CaptureScreen, ResultScreen) on branch part-3-app and the action card
// hierarchy in docs/build-plan.md step 3.5. Card text comes from buildActionCard via productCopy.json.

export type LeafPhoto = { src: string; position: string; zoom: number };

/** Six leaf photos cut from the licensed rust photographs, standing in for the six leaves the daughter scans. */
export const SIX_LEAVES: LeafPhoto[] = [
  { src: "images/rust-underside.jpg", position: "78% 30%", zoom: 1.6 },
  { src: "images/rust-topside.jpg", position: "80% 45%", zoom: 1.5 },
  { src: "images/rust-kiambu.jpg", position: "40% 62%", zoom: 1.7 },
  { src: "images/rust-underside.jpg", position: "62% 22%", zoom: 2.0 },
  { src: "images/rust-topside.jpg", position: "35% 55%", zoom: 1.6 },
  { src: "images/rust-kiambu.jpg", position: "62% 30%", zoom: 1.9 },
];

function LeafImage({ leaf, style, className }: { leaf: LeafPhoto; style?: CSSProperties; className?: string }) {
  return <Img src={staticFile(leaf.src)} className={`size-full object-cover ${className ?? ""}`} style={{ ...style, objectPosition: leaf.position, scale: String(leaf.zoom), transformOrigin: leaf.position }} />;
}

function LeafMarks({ taken }: { taken: number }) {
  return (
    <div className="flex justify-center gap-3" aria-label={`${taken} of 6 leaves taken`}>
      {SIX_LEAVES.map((_, index) => (
        <span key={index} className="size-[30px] rounded-full" style={{ background: index < taken ? "var(--brand-leaf)" : "var(--brand-paper-sunken)" }} />
      ))}
    </div>
  );
}

export type CaptureMoments = { firstShotAt: number; every: number; offlineAt: number };

export function CaptureScreen({ moments }: { moments: CaptureMoments }) {
  const frame = useCurrentFrame();
  const taken = Math.max(0, Math.min(6, Math.floor((frame - moments.firstShotAt) / moments.every) + 1));
  const current = SIX_LEAVES[Math.max(0, Math.min(5, taken - 1))];
  const sinceShot = (frame - moments.firstShotAt) % moments.every;
  const sweep = taken > 0 ? progress(sinceShot, 0, moments.every - 2, (t) => t) : 0;
  return (
    <div className="flex size-full flex-col gap-6 px-6 pt-16">
      <p className="text-app-title font-bold">{taken > 0 ? "Looking at the leaf…" : "Check a coffee leaf"}</p>
      <LeafMarks taken={taken} />
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-paper-sunken">
        {taken > 0 && <LeafImage leaf={current} />}
        {taken > 0 && taken <= 6 && <ScanBar at={sweep} />}
        <div className="absolute inset-0 bg-paper-raised" style={{ opacity: 0.8 * (1 - progress(sinceShot, 0, 5)) * (taken > 0 ? 1 : 0) }} />
      </div>
      <p className="text-app-body text-ink-muted">Hold one leaf flat in good light, close enough to fill the screen.</p>
      <Spotlight on={progress(frame, moments.offlineAt, 8)} className="self-center px-4 py-2">
        <span className="flex items-center gap-2 text-app-body text-ink-muted">
          <WifiSlash size={28} /> Works without internet
        </span>
      </Spotlight>
    </div>
  );
}

export type CardMoments = { headlineAt: number; stepsAt: number; callAt: number; recheckAt: number };

function Reveal({ at, children }: { at: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  return <div style={{ opacity: shown, translate: `0 ${(1 - shown) * 30}px` }}>{children}</div>;
}

function spotlightFor(frame: number, at: number, until: number) {
  return progress(frame, at, 8) * (1 - progress(frame, until, 10));
}

function SeverityBadge() {
  return (
    <span className="inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-app-body font-bold text-unclear" style={{ background: "color-mix(in srgb, var(--brand-state-unclear) 12%, var(--brand-paper-raised))" }}>
      <WarningOctagon size={28} weight="fill" /> Act soon
    </span>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="flex size-[40px] shrink-0 items-center justify-center rounded-full bg-leaf text-app-body font-bold text-on-leaf">{number}</span>
      <p className="text-app-body">{text}</p>
    </div>
  );
}

function PhotoMarks() {
  const results: Icon[] = [CheckCircle, CheckCircle, CheckCircle, Question, CheckCircle, CheckCircle];
  return (
    <div className="flex gap-2">
      {SIX_LEAVES.map((leaf, index) => {
        const Mark = results[index];
        return (
          <div key={index} className="relative size-[76px] overflow-hidden rounded-md">
            <LeafImage leaf={leaf} />
            <Mark size={30} weight="fill" className={`absolute bottom-1 right-1 rounded-full bg-paper-raised ${Mark === Question ? "text-possible" : "text-leaf"}`} />
          </div>
        );
      })}
    </div>
  );
}

export function ActionCardScreen({ moments, recheckDate }: { moments: CardMoments; recheckDate: string }) {
  const frame = useCurrentFrame();
  const card = productCopy.rustCard;
  return (
    <div className="flex size-full flex-col gap-4 px-5 pt-14">
      <Reveal at={2}>
        <Spotlight on={spotlightFor(frame, moments.headlineAt, moments.stepsAt)} className="flex flex-col gap-3 p-2">
          <div className="flex items-start gap-4">
            <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-leaf-soft text-leaf">
              <Scissors size={42} weight="bold" />
            </span>
            <p className="text-app-title font-bold text-balance">{card.headline}</p>
          </div>
          <SeverityBadge />
        </Spotlight>
      </Reveal>
      <Reveal at={8}>
        <Spotlight on={spotlightFor(frame, moments.stepsAt, moments.callAt)}>
          <ScreenCard className="flex flex-col gap-3">
            {card.doNow.slice(0, 3).map((step, index) => (
              <Step key={step} number={index + 1} text={step} />
            ))}
          </ScreenCard>
        </Spotlight>
      </Reveal>
      <Reveal at={14}>
        <Spotlight on={spotlightFor(frame, moments.callAt, moments.recheckAt)}>
          <ScreenCard className="flex flex-col gap-3">
            <p className="text-app-body text-ink-muted">{productCopy.rustCard.contactName}</p>
            <ScreenButton label="Call your field officer" icon={Phone} />
          </ScreenCard>
        </Spotlight>
      </Reveal>
      <Reveal at={20}>
        <Spotlight on={progress(frame, moments.recheckAt, 8)}>
          <ScreenCard tone="soft" className="flex items-center gap-3 py-4 text-app-heading font-bold">
            <CalendarCheck size={36} weight="bold" className="text-leaf" /> Check again on {recheckDate}
          </ScreenCard>
        </Spotlight>
      </Reveal>
      <Reveal at={26}>
        <div className="flex items-center justify-between px-2 text-app-body text-ink-muted">
          What else could it be <CaretDown size={28} />
        </div>
      </Reveal>
      <Reveal at={32}>
        <PhotoMarks />
      </Reveal>
    </div>
  );
}

export type UnsureMoments = { tapAt: number };

export function NotSureScreen({ moments }: { moments: UnsureMoments }) {
  const frame = useCurrentFrame();
  const results: Icon[] = [CheckCircle, Question, CheckCircle, Question, Question, CheckCircle];
  return (
    <div className="flex size-full flex-col gap-6 px-6 pt-16">
      <div className="grid grid-cols-3 gap-3">
        {SIX_LEAVES.map((leaf, index) => {
          const Mark = results[index];
          const wobble = Math.sin(frame * 0.5 + index * 2) * 2 * (1 - progress(frame, 20, 10));
          return (
            <div key={index} className="relative aspect-square overflow-hidden rounded-md" style={{ rotate: `${wobble}deg` }}>
              <LeafImage leaf={SIX_LEAVES[(index + 2) % 6]} />
              <Mark size={34} weight="fill" className={`absolute bottom-2 right-2 rounded-full bg-paper-raised ${Mark === Question ? "text-possible" : "text-leaf"}`} />
            </div>
          );
        })}
      </div>
      <p className="text-app-title font-bold text-balance">{productCopy.unsureCard.headline}</p>
      <p className="text-app-body text-ink-muted">{productCopy.unsureCard.doNow[0]}</p>
      <ScreenButton label="Send to field officer" icon={PaperPlaneTilt} pressed={frame >= moments.tapAt && frame < moments.tapAt + 6} />
    </div>
  );
}
