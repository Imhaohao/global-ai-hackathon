import { GlobeSimpleX } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Tile } from "../components/Pile";
import { Wordmark } from "../components/Wordmark";
import { BasicPhone, FarmerGrid } from "../shared/FarmerGrid";
import { glide, leave, progress, settle, snap, window } from "../lib/ease";
import { SCENES, VOICE_START, cue } from "../timeline";

const END = SCENES.intro.to;
const GRID_IN = cue("reach", "don't") - 4;
const OFFLINE_AT = cue("barriers", "online");
const BASIC_AT = cue("barriers", "basic");
const ADVISER_AT = cue("barriers", "adviser") - 4;
const REACH_AT = cue("promise", "removes");
const DEVICES_AT = cue("promise", "the") - 4;
const END_FADE = DEVICES_AT - 8;

const clip = (src: string, at: number) => (
  <Sequence from={at} layout="none">
    <OffthreadVideo src={staticFile(src)} muted className="block h-full w-full object-cover" />
  </Sequence>
);

/** The tools that already exist, piling up: an expert, the app, the farms they should reach. */
function ToolsPile() {
  const frame = useCurrentFrame();
  const until = GRID_IN + 10;
  if (frame > until + 2) return null;
  return (
    <>
      <Tile at={VOICE_START.reach} until={until} x={140} y={140} tilt={-3} width={960}>
        <div className="h-[540px]">{clip("video/highlands.mp4", VOICE_START.reach)}</div>
      </Tile>
      <Tile at={cue("reach", "tools")} until={until} x={1000} y={110} tilt={4} width={560}>
        <Img src={staticFile("images/officer-kenya.jpg")} className="block h-[560px] w-full object-cover" />
      </Tile>
      <Tile at={cue("reach", "harvest")} until={until} x={420} y={430} tilt={-4} width={640}>
        <div className="h-[360px]">{clip("video/coffee-rain.mp4", cue("reach", "harvest"))}</div>
      </Tile>
      <Tile at={cue("reach", "exist")} until={until} x={1180} y={470} tilt={3} width={480}>
        <div className="h-[420px]">{clip("video/coffee-farm.mp4", cue("reach", "exist"))}</div>
      </Tile>
    </>
  );
}

/** A count that ticks up beside the icon of the barrier it counts. */
function Count({ value, at, until, icon }: { value: number; at: number; until: number; icon: ReactNode }) {
  const frame = useCurrentFrame();
  const shown = window(frame, at, until, 10, 8);
  const count = Math.round(value * progress(frame, at, 24, snap));
  return (
    <div className="absolute flex items-center gap-10" style={{ left: 1130, top: 400, opacity: shown, translate: `0 ${(1 - progress(frame, at, 14)) * 40}px` }}>
      <div className="flex size-[150px] items-center justify-center">{icon}</div>
      <div className="display-poster figures text-poster text-on-night">{count}</div>
    </div>
  );
}

/** One adviser for hundreds of farms: the officer's photo with Kenya's target ratio ticking up. */
function Adviser() {
  const frame = useCurrentFrame();
  const until = REACH_AT - 2;
  const target = Math.round(600 * progress(frame, cue("barriers", "hundreds"), 22, snap));
  if (frame < ADVISER_AT - 2 || frame > until + 2) return null;
  return (
    <>
      <Tile at={ADVISER_AT} until={until} x={1120} y={170} tilt={3} width={440}>
        <Img src={staticFile("images/officer-kenya.jpg")} className="block h-[440px] w-full object-cover" />
      </Tile>
      <Tile at={cue("barriers", "hundreds") - 4} until={until} x={1180} y={640} tilt={-2} width={500}>
        <div className="overflow-hidden bg-paper-raised px-10 py-7 text-ink" data-box="target-card">
          <div className="display-poster figures whitespace-nowrap text-headline">1 : {target}</div>
        </div>
      </Tile>
    </>
  );
}

/**
 * Access, not disease: the tools exist but do not reach farmers. 66 of 100 lose daily internet, 38 hold a basic phone,
 * one adviser covers hundreds; then Leaf Doctor reaches them all.
 */
export function Intro() {
  const frame = useCurrentFrame();
  if (frame > END + 2) return null;
  const grid = progress(frame, GRID_IN, 16, settle);
  const aside = progress(frame, ADVISER_AT - 6, 16, glide) * (1 - progress(frame, REACH_AT - 4, 16, glide));
  const gone = progress(frame, END_FADE, 12, leave);
  const name = window(frame, REACH_AT, DEVICES_AT, 10, 8);
  return (
    <AbsoluteFill className="bg-night">
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 40% 50%, rgba(31,81,53,0.35) 0%, rgba(13,15,11,0) 60%)" }} />
      <AbsoluteFill className="items-center justify-center">
        <div style={{ opacity: grid * (1 - gone) * (1 - 0.5 * aside), translate: `${interpolate(aside, [0, 1], [-330, -420])}px ${(1 - grid) * 40}px`, scale: 0.94 + 0.06 * grid }}>
          <FarmerGrid stage="opening" signalAt={OFFLINE_AT} phonesAt={BASIC_AT} reachAt={REACH_AT} size={760} swapFrames={40} />
        </div>
      </AbsoluteFill>
      <ToolsPile />
      <Count value={66} at={OFFLINE_AT} until={BASIC_AT - 2} icon={<GlobeSimpleX size={140} weight="bold" color="#f0641e" />} />
      <Count value={38} at={BASIC_AT} until={ADVISER_AT - 2} icon={<div style={{ width: 84, height: 144 }}><BasicPhone colour="#d9d6cc" /></div>} />
      <Adviser />
      <div className="absolute" style={{ left: 1140, top: 450, opacity: name }}>
        <Wordmark at={REACH_AT} size={150} />
      </div>
    </AbsoluteFill>
  );
}
