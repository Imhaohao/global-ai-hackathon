import { Leaf } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { Spore } from "../components/Spore";
import { RACE } from "../data/facts";
import { glide, leave, progress, snap } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const TRACK = { left: 620, width: 940 };
const START = 12;

function clock(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The simulated race clock in seconds: real time to our finish, then a time-lapse until Astra finishes. */
function raceSeconds(frame: number, oursDoneAt: number, astraDoneAt: number) {
  if (frame <= oursDoneAt) return RACE.oursSeconds * progress(frame, START, oursDoneAt - START, (t) => t);
  return RACE.oursSeconds + (RACE.astraSeconds - RACE.oursSeconds) * progress(frame, oursDoneAt + 4, astraDoneAt - oursDoneAt - 4, glide);
}

function OpenAiMark() {
  const mask = `url(${staticFile("media/openai-symbol.svg")})`;
  return <div className="size-[96px] bg-text" style={{ maskImage: mask, WebkitMaskImage: mask, maskSize: "contain", WebkitMaskSize: "contain", maskRepeat: "no-repeat" }} />;
}

function LeafMark() {
  return (
    <div className="relative size-[96px]">
      <Leaf size={96} weight="fill" className="text-live" />
      <Spore x={70} y={26} size={26} />
    </div>
  );
}

type LaneProps = { y: number; mark: ReactNode; name: string; done: number; value: string; lit: boolean; valueOpacity: number };

function Lane({ y, mark, name, done, value, lit, valueOpacity }: LaneProps) {
  return (
    <div data-box="lane" className="absolute inset-x-0 h-[100px]" style={{ top: y }}>
      <div className="absolute left-[120px] flex items-center gap-6">
        {mark}
        <span className="display-headline text-title text-text">{name}</span>
      </div>
      <div className="absolute h-[64px] overflow-hidden rounded-sm bg-night-high" style={{ left: TRACK.left, width: TRACK.width, top: 16 }}>
        <div className="h-full" style={{ width: `${done * 100}%`, background: lit ? "var(--color-live)" : "var(--color-text-muted)", boxShadow: lit ? "0 0 40px var(--color-live)" : undefined }} />
        <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.35) 0 1px, transparent 1px 8px)" }} />
      </div>
      <span className={`absolute font-data text-headline figures ${lit ? "text-live" : "text-text"}`} style={{ left: TRACK.left + TRACK.width + 40, top: 10, opacity: valueOpacity }}>
        {value}
      </span>
    </div>
  );
}

/** Solution evidence: the same 1,119 outside rust photos, Leaf Doctor's small model against GPT-6 Astra. */
export function Race() {
  const frame = useCurrentFrame();
  const oursDoneAt = wordAt("race", "thirty-three") - 8;
  const astraDoneAt = wordAt("race", "Astra") + 6;
  const rankAt = wordAt("race", "ranks") - 4;
  const seconds = raceSeconds(frame, oursDoneAt, astraDoneAt);
  const ours = Math.min(1, seconds / RACE.oursSeconds);
  const astra = Math.min(1, seconds / RACE.astraSeconds);
  const ranking = frame >= rankAt;
  const header = progress(frame, 0, 10) - progress(frame, oursDoneAt - 6, 8, leave);
  const times = 1 - progress(frame, rankAt - 6, 6, leave);
  const auroc = progress(frame, rankAt, 10);
  const faster = progress(frame, oursDoneAt + 8, 10, snap) - progress(frame, rankAt - 8, 8, leave);
  return (
    <AbsoluteFill className="bg-night">
      <p className="absolute left-[120px] top-[150px] display-headline text-headline text-text-muted" style={{ opacity: header }}>
        <span className="figures">{RACE.images.toLocaleString("en-US")}</span> photos
      </p>
      <p className="absolute left-[120px] top-[150px] display-headline text-headline text-text-muted" style={{ opacity: auroc }}>
        AUROC
      </p>
      <div style={{ opacity: progress(frame, 0, 12) }}>
        <Lane y={330} mark={<LeafMark />} name="Leaf Doctor" done={ours} value={ranking ? RACE.oursAuroc : clock(Math.min(seconds, RACE.oursSeconds))} lit valueOpacity={ranking ? auroc : times} />
        <Lane y={560} mark={<OpenAiMark />} name="GPT-6 Astra" done={astra} value={ranking ? RACE.astraAuroc : clock(seconds)} lit={false} valueOpacity={ranking ? auroc : times} />
      </div>
      <p className="absolute inset-x-0 top-[780px] text-center display-poster text-poster text-live" style={{ opacity: faster, scale: String(1.3 - 0.3 * progress(frame, oursDoneAt + 8, 10, snap)) }}>
        33× faster
      </p>
      <p className="absolute left-[120px] top-[800px] text-lead text-text-muted" style={{ opacity: auroc }}>
        Team benchmark
      </p>
    </AbsoluteFill>
  );
}
