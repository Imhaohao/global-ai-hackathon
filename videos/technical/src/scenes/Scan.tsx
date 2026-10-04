import { AirplaneTilt, CheckCircle, LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import { Phone } from "../components/Phone";
import analysis from "../data/analysis.json";
import { DATASETS, SPLIT, STAGES } from "../data/facts";
import groups from "../data/groups.json";
import { SOURCE_COLOURS } from "../data/sources";
import { glide, leave, progress } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";

const AXIS_Y = 560;
const blockHeight = (grid: number) => 120 + Math.log2(grid / 7) * 66;
const blockWidth = (channels: number) => Math.sqrt(channels) * 12;

function stageLayout() {
  let x = 820;
  return STAGES.map((stage, index) => {
    const layout = { ...stage, index, x, width: blockWidth(stage.channels), height: blockHeight(stage.grid) };
    x += layout.width + 22;
    return layout;
  });
}
const LAYOUT = stageLayout();
const HEAD_X = LAYOUT[LAYOUT.length - 1].x + LAYOUT[LAYOUT.length - 1].width + 30;

function Network({ at, tuneAt }: { at: number; tuneAt: number }) {
  const frame = useCurrentFrame();
  const lit = progress(frame, tuneAt, 14);
  return (
    <>
      {LAYOUT.map((stage) => {
        const shown = progress(frame, at + stage.index * 3, 12);
        const trains = stage.trains ? lit : 0;
        const Lock = trains > 0 ? LockSimpleOpen : LockSimple;
        return (
          <div key={stage.index} className="absolute" style={{ left: stage.x, top: AXIS_Y - stage.height / 2, width: stage.width, height: stage.height, opacity: shown, scale: `1 ${0.4 + 0.6 * shown}` }}>
            <div className="absolute inset-0 overflow-hidden" style={{ background: trains > 0 ? "color-mix(in srgb, var(--color-live) 30%, var(--color-night-high))" : "var(--color-night-high)", boxShadow: `0 0 0 ${1 + trains}px ${trains > 0 ? "var(--color-live)" : "var(--color-night-line)"}, 0 0 ${50 * trains}px color-mix(in srgb, var(--color-live) 40%, transparent)` }}>
              <Img src={staticFile(`analysis/stage-${stage.index + 1}.png`)} className="absolute inset-0 size-full object-cover" style={{ mixBlendMode: "screen", opacity: 0.5 }} />
            </div>
            <Lock size={30} weight="bold" className="absolute left-1/2 -translate-x-1/2" style={{ top: -44, color: trains > 0 ? "var(--color-live)" : "var(--color-text-faint)" }} />
          </div>
        );
      })}
      <div className="absolute w-[30px]" style={{ left: HEAD_X, top: AXIS_Y - 150, height: 300, background: lit > 0 ? "var(--color-live)" : "var(--color-night-high)", opacity: progress(frame, at + 20, 12) }} />
      <p className="absolute display-headline text-title text-live" style={{ left: LAYOUT[5].x, top: AXIS_Y + 200, opacity: lit }}>
        Fine-tuned
      </p>
    </>
  );
}

const SOURCE_Y = (index: number) => 300 + index * 130;

function SourceStreams({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(3);
  const particles = Array.from({ length: 70 }, (_, index) => ({ source: index % 5, offset: random() * 40, speed: 0.9 + random() * 0.5 }));
  return (
    <>
      {DATASETS.map((source, index) => {
        const shown = progress(frame, at + index * 4, 12);
        return (
          <div key={source.name} className="absolute flex items-center gap-4" style={{ left: 120, top: SOURCE_Y(index) - 24, opacity: shown }}>
            <span className="size-[22px] rounded-full" style={{ background: SOURCE_COLOURS[index] }} />
            <span className="text-lead font-bold text-text">{source.name}</span>
          </div>
        );
      })}
      {particles.map((particle, index) => {
        const t = (((frame - at - particle.offset) * particle.speed) % 40) / 40;
        if (frame - at - particle.offset < 0) return null;
        const start = { x: 470, y: SOURCE_Y(particle.source) };
        const end = { x: 800, y: AXIS_Y };
        const eased = glide(t);
        return <span key={index} className="absolute size-[10px] rounded-full" style={{ left: start.x + (end.x - start.x) * eased, top: start.y + (end.y - start.y) * eased, background: SOURCE_COLOURS[particle.source], opacity: 1 - t * 0.4 }} />;
      })}
      <div className="absolute flex items-baseline" style={{ left: 820, top: 40, opacity: progress(frame, at, 10) }}>
        <Counter to={SPLIT.train} at={at} duration={36} className="display-poster text-poster text-text" />
      </div>
    </>
  );
}

const DOT = 14;
const COLUMNS = [
  { key: "train", label: "Train", perRow: 34, x: 160 },
  { key: "val", label: "Validation", perRow: 15, x: 720 },
  { key: "test", label: "Test", perRow: 15, x: 1000 },
] as const;

function Split({ at, checkAt }: { at: number; checkAt: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(31);
  return (
    <AbsoluteFill>
      {COLUMNS.map((column, columnIndex) => {
        const data = groups[column.key];
        const shown = progress(frame, at + columnIndex * 6, 12);
        return (
          <div key={column.key}>
            <p className="absolute display-headline text-title text-text" style={{ left: column.x, top: 220, opacity: shown }}>
              {column.label}
            </p>
            {columnIndex > 0 && <div className="absolute w-[3px] bg-text-faint" style={{ left: column.x - 30, top: 220, height: 640 * shown }} />}
            {data.dots.map((source, index) => {
              const settle = progress(frame, at + 4 + random() * 40, 22, glide);
              const tx = column.x + (index % column.perRow) * DOT;
              const ty = 320 + Math.floor(index / column.perRow) * DOT;
              const fromX = 900 + (random() - 0.5) * 300;
              const fromY = 560 + (random() - 0.5) * 200;
              return <span key={index} className="absolute rounded-full" style={{ left: fromX + (tx - fromX) * settle, top: fromY + (ty - fromY) * settle, width: DOT - 4, height: DOT - 4, background: SOURCE_COLOURS[source], opacity: settle > 0 ? 0.95 : 0 }} />;
            })}
          </div>
        );
      })}
      <div className="absolute left-[1330px] top-[440px] flex items-center gap-5 text-live" style={{ opacity: progress(frame, checkAt, 12), scale: String(0.8 + 0.2 * progress(frame, checkAt, 12)) }}>
        <CheckCircle size={110} weight="fill" />
        <span className="display-headline text-headline">0 overlap</span>
      </div>
    </AbsoluteFill>
  );
}

/** Explanation: the weekend smartphone scan, and how the small model on it was trained and tested. */
export function Scan() {
  const frame = useCurrentFrame();
  const offlineAt = wordAt("scan", "offline");
  const modelAt = wordAt("scan", "with") - 6;
  const tuneAt = wordAt("scan", "fine-tuned");
  const dataAt = wordAt("scan", "twenty");
  const splitAt = wordAt("scan", "split") - 4;
  const phoneOut = progress(frame, modelAt - 4, 14, leave);
  const networkOut = progress(frame, splitAt - 10, 10, leave);
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute inset-0" style={{ opacity: 1 - phoneOut, translate: `${-phoneOut * 300}px 0` }}>
        <Phone src="rec/scan.mp4" height={960} startFrom={2.9} playbackRate={0.6} className="left-[740px] top-[60px]" videoStyle={{ scale: "1.9", transformOrigin: "50% 38%" }} />
        <div className="absolute left-[1240px] top-[460px] flex items-center gap-4 text-live" style={{ opacity: progress(frame, offlineAt, 12) }}>
          <AirplaneTilt size={84} weight="fill" />
          <span className="display-headline text-headline">Offline</span>
        </div>
      </div>
      <div className="absolute inset-0" style={{ opacity: (frame >= modelAt ? 1 : 0) * (1 - networkOut) }}>
        <Img src={staticFile(`analysis/${analysis.leaves[3].image}.png`)} className="absolute size-[180px]" style={{ left: 600, top: AXIS_Y - 90, opacity: progress(frame, modelAt, 12) }} />
        <Network at={modelAt} tuneAt={tuneAt} />
        {frame >= dataAt - 4 && <SourceStreams at={dataAt - 4} />}
      </div>
      {frame >= splitAt && <Split at={splitAt} checkAt={wordAt("scan", "honest") - 6} />}
    </AbsoluteFill>
  );
}
