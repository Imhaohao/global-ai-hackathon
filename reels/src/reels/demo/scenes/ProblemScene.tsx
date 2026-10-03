import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { RevealLines } from "../../../components/RevealLines";
import { Slab } from "../../../components/Slab";
import { CountUp } from "../../../components/Stat";
import { FloorShade, Paper } from "../../../components/Surface";
import { glide, progress } from "../../../lib/ease";
import { SOURCES } from "../credits";
import { wordAt } from "../timeline";

const GRID = { columns: 50, rows: 20, pitch: 18.4, left: 80, top: 0 } as const;
const PEOPLE = GRID.columns * GRID.rows;
const OWN_A_PHONE = Math.round(0.915 * PEOPLE);
const BASIC_PHONE = Math.round(0.384 * PEOPLE);

const phonesFrom = wordAt("problem", "rural") - 12;

function Noor() {
  const frame = useCurrentFrame();
  const statAt = 18;
  const lift = progress(frame, statAt, 16);
  return (
    <Punch flash={0.4}>
      <Photo src="images/noor-slope.jpg" from={{ scale: 1.16, y: 20 }} to={{ scale: 1.02, y: -10 }} duration={phonesFrom} origin="45% 40%" />
      <FloorShade strength={0.45} from={50} />
      <div className="absolute inset-x-safe-side top-[200px]" style={{ opacity: lift, translate: `0 ${(1 - lift) * 30}px` }}>
        <Slab className="inline-flex flex-col gap-2 px-8 py-6">
          <span className="display-headline text-headline text-leaf">
            <CountUp value={45.8} at={statAt} duration={26} suffix="%" />
          </span>
          <span className="text-lead font-bold">of jobs in Kenya are in farming</span>
          <span className="text-fineprint text-ink-muted">
            {SOURCES.farmJobs.source}, {SOURCES.farmJobs.year}
          </span>
        </Slab>
      </div>
      <div className="absolute left-safe-side bottom-[600px]">
        <RevealLines lines={["Noor"]} at={4} className="display-poster text-figure text-paper-raised [text-shadow:0_12px_50px_rgba(16,18,14,0.5)]" />
        <FinePrint at={14} tone="light" className="max-w-[640px]">
          Noor is a fictional farmer from the hackathon brief, and this picture of her was made with AI.
        </FinePrint>
      </div>
    </Punch>
  );
}

function dotState(index: number, frame: number, ownersAt: number, basicAt: number) {
  const column = Math.floor(index / GRID.rows);
  const owned = index < OWN_A_PHONE && frame >= ownersAt + column * 0.5;
  const basic = index < BASIC_PHONE && frame >= basicAt + column * 1.1;
  if (basic) return "basic";
  return owned ? "owner" : "none";
}

const DOT_FILL = { basic: "var(--brand-rust)", owner: "var(--brand-ink)", none: "var(--brand-ink-faint)" } as const;

function PeopleGrid({ ownersAt, basicAt }: { ownersAt: number; basicAt: number }) {
  const frame = useCurrentFrame();
  return (
    <svg width={1080} height={GRID.rows * GRID.pitch + 20} className="block" aria-label="1,000 dots, one for each of 1,000 rural adults">
      <defs>
        <filter id="spore-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {Array.from({ length: PEOPLE }, (_, index) => {
        const column = Math.floor(index / GRID.rows);
        const row = index % GRID.rows;
        const appear = progress(frame, column * 0.4, 10);
        const state = dotState(index, frame, ownersAt, basicAt);
        return (
          <circle
            key={index}
            cx={GRID.left + column * GRID.pitch + GRID.pitch / 2}
            cy={10 + row * GRID.pitch + GRID.pitch / 2}
            r={state === "basic" ? 6.2 : 5.4}
            fill={DOT_FILL[state]}
            opacity={appear * (state === "none" ? 0.45 : 1)}
            filter={state === "basic" ? "url(#spore-glow)" : undefined}
          />
        );
      })}
    </svg>
  );
}

function LegendDot({ color, glow }: { color: string; glow?: boolean }) {
  return <span className="inline-block size-[22px] shrink-0 rounded-full" style={{ background: color, boxShadow: glow ? "0 0 12px 2px color-mix(in srgb, var(--brand-rust) 60%, transparent)" : undefined }} />;
}

function Phones() {
  const frame = useCurrentFrame();
  const basicAt = 22;
  const legend = progress(frame, wordAt("problem", "basic") - phonesFrom - 10, 14);
  return (
    <Punch flash={0.5}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[230px] flex flex-col gap-4">
          <span className="display-poster text-figure text-ink">
            <CountUp value={38.4} at={basicAt} duration={40} suffix="%" />
          </span>
          <RevealLines lines={["of rural adults in Kenya use a", "basic text phone as their main phone"]} at={basicAt + 6} className="text-lead font-bold text-ink" />
        </div>
        <div className="absolute inset-x-0 top-[700px]">
          <PeopleGrid ownersAt={4} basicAt={basicAt} />
        </div>
        <div className="absolute inset-x-safe-side top-[1110px] flex flex-col gap-3 text-label" style={{ opacity: legend }}>
          <span className="flex items-center gap-4">
            <LegendDot color="var(--brand-rust)" glow /> Main phone is a basic text phone, 38.4%
          </span>
          <span className="flex items-center gap-4">
            <LegendDot color="var(--brand-ink)" /> Owns a phone, 91.5% in all
          </span>
        </div>
        <div className="absolute inset-x-safe-side top-[1270px]">
          <FinePrint at={basicAt + 20}>
            Each dot is one in 1,000 rural adults. {SOURCES.basicPhone.source}, {SOURCES.basicPhone.year}.
          </FinePrint>
        </div>
      </Paper>
    </Punch>
  );
}

const RING_FARMERS = 600;

function OfficerRing({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <svg width={760} height={760} viewBox="-380 -380 760 760" className="block" aria-label="One officer dot surrounded by 600 farmer dots">
      {Array.from({ length: RING_FARMERS }, (_, index) => {
        const ring = Math.floor(Math.sqrt(index / 6));
        const angle = index * 2.39996;
        const radius = 70 + Math.sqrt(index) * 12.4;
        const shown = progress(frame, at + ring * 1.6, 12, glide);
        return <circle key={index} cx={Math.cos(angle) * radius * shown} cy={Math.sin(angle) * radius * shown} r={5} fill="var(--brand-ink-faint)" opacity={shown * 0.8} />;
      })}
      <circle r={30} fill="var(--brand-leaf)" />
    </svg>
  );
}

function Officers() {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, 14);
  return (
    <Punch flash={0.5}>
      <Paper>
        <div className="absolute inset-x-0 top-[150px] flex justify-center" style={{ opacity: enter }}>
          <OfficerRing at={4} />
        </div>
        <div className="absolute inset-x-safe-side top-[930px] flex flex-col gap-4">
          <span className="display-poster text-figure figures text-leaf">1 : 600</span>
          <RevealLines lines={["Kenya aims for one extension officer", "for every 600 farmers by 2029"]} at={8} className="text-lead font-bold text-ink" />
          <FinePrint at={22}>The same policy says the ratio of extension staff to farmers “has not improved”. {SOURCES.extensionTarget.source}.</FinePrint>
        </div>
      </Paper>
    </Punch>
  );
}

export function ProblemScene({ length }: { length: number }) {
  const officersFrom = wordAt("problem", "extension") - 6;
  return (
    <>
      <Sequence durationInFrames={phonesFrom} layout="none">
        <Noor />
      </Sequence>
      <Sequence from={phonesFrom} durationInFrames={officersFrom - phonesFrom} layout="none">
        <Phones />
      </Sequence>
      <Sequence from={officersFrom} durationInFrames={length - officersFrom} layout="none">
        <Officers />
      </Sequence>
    </>
  );
}
