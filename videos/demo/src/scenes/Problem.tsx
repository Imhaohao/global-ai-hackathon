import { CellSignalSlash } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Tile } from "../components/Pile";
import { BasicPhone, FarmerGrid } from "../shared/FarmerGrid";
import { leave, progress, settle, snap, window } from "../lib/ease";
import { SCENES, VOICE_START, cue } from "../timeline";

const GRID_SIZE = 760;
const GRID_X = -330;
const BASIC_AT = cue("problem", "four");
const OFFLINE_AT = cue("problem", "two");
const PILE_AT = VOICE_START.advisers - 4;
const END = SCENES.problem.to;

/** A figure that ticks up from zero as it lands, beside the icon of what it counts. */
function Figure({ value, at, until, icon }: { value: number; at: number; until: number; icon: ReactNode }) {
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

/** A clip that starts playing from its first frame when its tile lands. */
const clip = (src: string, at: number) => (
  <Sequence from={at} layout="none">
    <OffthreadVideo src={staticFile(src)} muted className="block h-full w-full object-cover" />
  </Sequence>
);

/** The adviser gap as a pile of real photographs landing faster than one adviser could visit them. */
function AdviserPile() {
  const frame = useCurrentFrame();
  const target = Math.round(600 * progress(frame, cue("advisers", "hundreds"), 22, snap));
  return (
    <>
      <Tile at={PILE_AT} until={END} x={150} y={130} tilt={-3} width={980}>
        <div className="h-[560px]">{clip("video/highlands.mp4", PILE_AT)}</div>
      </Tile>
      <Tile at={cue("advisers", "each")} until={END} x={760} y={90} tilt={4} width={760}>
        <div className="h-[430px]">{clip("video/coffee-rain.mp4", cue("advisers", "each"))}</div>
      </Tile>
      <Tile at={cue("advisers", "farm")} until={END} x={300} y={500} tilt={-5} width={620}>
        <div className="h-[350px]">{clip("video/basic-phone.mp4", cue("advisers", "farm"))}</div>
      </Tile>
      <Tile at={cue("advisers", "adviser")} until={END} x={1080} y={360} tilt={3} width={430}>
        <Img src={staticFile("images/field-officer.jpg")} className="block h-[560px] w-full object-cover" style={{ objectPosition: "50% 8%" }} />
      </Tile>
      <Tile at={cue("advisers", "hundreds") - 4} until={END} x={1260} y={700} tilt={-2} width={520}>
        <div className="overflow-hidden bg-paper-raised px-10 py-7 text-ink" data-box="target-card">
          <div className="display-poster figures whitespace-nowrap text-headline">1 : {target}</div>
          <div className="mt-2 text-label">Kenya's 2029 target</div>
        </div>
      </Tile>
    </>
  );
}

/** The access gap: 100 farmers, 38 on a basic phone, 66 not online daily, then the pile of farms per adviser. */
export function Problem() {
  const frame = useCurrentFrame();
  if (frame > END + 2) return null;
  const enter = progress(frame, 0, 18, settle);
  const recede = interpolate(frame, [PILE_AT - 6, PILE_AT + 10], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="bg-night" style={{ opacity: 1 - progress(frame, END - 8, 8, leave) }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 35% 50%, rgba(31,81,53,0.35) 0%, rgba(13,15,11,0) 60%)" }} />
      <AbsoluteFill className="items-center justify-center">
        <div style={{ translate: `${GRID_X * recede}px ${(1 - enter) * 30}px`, opacity: enter * (0.25 + 0.75 * recede), scale: (0.96 + 0.04 * enter) * (0.85 + 0.15 * recede), filter: `blur(${(1 - recede) * 6}px)` }}>
          <FarmerGrid stage="opening" phonesAt={BASIC_AT} signalAt={OFFLINE_AT} size={GRID_SIZE} swapFrames={40} />
        </div>
      </AbsoluteFill>
      <Figure value={38} at={BASIC_AT} until={OFFLINE_AT - 2} icon={<div style={{ width: 84, height: 144 }}><BasicPhone colour="#d9d6cc" /></div>} />
      <Figure value={66} at={OFFLINE_AT} until={PILE_AT} icon={<CellSignalSlash size={140} weight="bold" color="#f0641e" />} />
      <AdviserPile />
    </AbsoluteFill>
  );
}
