import { CheckCircle, LockSimple, LockSimpleOpen } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import { PartHeading } from "../components/PartHeading";
import analysis from "../data/analysis.json";
import { DATASETS, MODEL, NON_COFFEE, SPLIT, STAGES } from "../data/facts";
import groups from "../data/groups.json";
import { SOURCE_COLOURS } from "../data/sources";
import { between, glide, leave, progress } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";

const BLOCK_GAP = 26;
const blockHeight = (grid: number) => 130 + Math.log2(grid / 7) * 72;
const blockWidth = (channels: number) => Math.sqrt(channels) * 13;

function stageLayout() {
  let x = 400;
  return STAGES.map((stage, index) => {
    const layout = { ...stage, index, x, width: blockWidth(stage.channels), height: blockHeight(stage.grid) };
    x += layout.width + BLOCK_GAP;
    return layout;
  });
}
const LAYOUT = stageLayout();
const HEAD_X = LAYOUT[LAYOUT.length - 1].x + LAYOUT[LAYOUT.length - 1].width + 40;
const AXIS_Y = 430;

function StageBlock({ stage, lit, at }: { stage: (typeof LAYOUT)[number]; lit: number; at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 12);
  const trains = stage.trains ? lit : 0;
  return (
    <div className="absolute" style={{ left: stage.x, top: AXIS_Y - stage.height / 2, width: stage.width, height: stage.height, opacity: shown, scale: `1 ${0.4 + 0.6 * shown}` }}>
      <div className="absolute inset-0 overflow-hidden" style={{ background: trains > 0 ? "color-mix(in srgb, var(--color-live) 32%, var(--color-night-high))" : "var(--color-night-high)", boxShadow: `0 0 0 ${1 + trains}px ${trains > 0 ? "var(--color-live)" : "var(--color-night-line)"}, 0 0 ${40 * trains}px color-mix(in srgb, var(--color-live) 40%, transparent)` }}>
        <Img src={staticFile(`analysis/stage-${stage.index + 1}.png`)} className="absolute inset-0 size-full object-cover" style={{ mixBlendMode: "screen", opacity: 0.55 }} />
      </div>
      <p className="absolute inset-x-[-20px] text-center text-fineprint text-text-muted figures" style={{ top: stage.height + 10 }}>
        {stage.grid}²
      </p>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: -40, color: trains > 0 ? "var(--color-live)" : "var(--color-text-faint)" }}>
        {trains > 0 ? <LockSimpleOpen size={26} weight="bold" /> : <LockSimple size={26} weight="bold" />}
      </div>
    </div>
  );
}

function Particles({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(7);
  const lanes = Array.from({ length: 22 }, () => ({ offset: random() * 90, speed: 9 + random() * 7, lane: (random() - 0.5) * 70 }));
  return (
    <>
      {lanes.map((lane, index) => {
        const travel = ((frame - at) * lane.speed + lane.offset * 12) % 1500;
        const x = 250 + travel;
        const visible = frame > at && x < HEAD_X + 60;
        return visible ? <span key={index} className="absolute rounded-full bg-rust-glow" style={{ left: x, top: AXIS_Y + lane.lane, width: 7, height: 7, opacity: 0.8, boxShadow: "0 0 12px var(--brand-rust)" }} /> : null;
      })}
    </>
  );
}

function Architecture({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const nameAt = wordAt("data", "EfficientNet");
  const litAt = wordAt("data", "fine-tuned") - 20;
  const lit = progress(frame, litAt, 14);
  const exit = progress(frame, exitAt, 14, leave);
  const rust = analysis.leaves.find((leaf) => leaf.image === "leaf-rust-2") ?? analysis.leaves[0];
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, translate: `0 ${-exit * 60}px` }}>
      <Img src={staticFile(`analysis/${rust.image}.png`)} className="absolute" style={{ left: 120, top: AXIS_Y - 110, width: 220, height: 220, opacity: progress(frame, 0, 12), boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1)" }} />
      <p className="absolute text-fineprint text-text-muted figures" style={{ left: 120, top: AXIS_Y + 122 }}>224 × 224 input</p>
      <Particles at={6} />
      {LAYOUT.map((stage) => (
        <StageBlock key={stage.index} stage={stage} lit={lit} at={4 + stage.index * 4} />
      ))}
      <div className="absolute" style={{ left: HEAD_X, top: AXIS_Y - 150, width: 34, height: 300, background: lit > 0 ? "var(--color-live)" : "var(--color-night-high)", opacity: progress(frame, 34, 12) }} />
      <div className="absolute flex flex-col gap-[7px]" style={{ left: HEAD_X + 70, top: AXIS_Y - 150, opacity: progress(frame, 40, 12) }}>
        {["cercospora", "healthy", "miner", "phoma", "rust", "red spider mite", "weevil damage", "unsupported"].map((label) => (
          <div key={label} className="flex items-center gap-3">
            <div className="h-[26px] bg-rust-glow" style={{ width: label === "rust" ? 150 * rust.probability * progress(frame, 50, 16) : 3 }} />
            <span className={`text-ui ${label === "rust" ? "font-bold text-text" : "text-text-faint"}`}>{label}</span>
            {label === "rust" && <span className="font-data text-ui text-rust-glow figures">{rust.probability.toFixed(2)}</span>}
          </div>
        ))}
      </div>
      <div className="absolute left-[400px] top-[760px] flex gap-16" style={{ opacity: progress(frame, nameAt, 12) }}>
        <div>
          <p className="display-headline text-title text-text">EfficientNet-B2</p>
          <p className="text-label text-text-muted">{MODEL.params} parameters, ImageNet weights to start</p>
        </div>
        <div style={{ opacity: lit }}>
          <p className="flex items-center gap-3 text-label font-bold text-live">
            <LockSimpleOpen size={30} weight="bold" /> Fine-tuned: stages 6–7, head, classifier
          </p>
          <p className="text-label text-text-muted">After the classifier trains alone first</p>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function DatasetRows({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const rows = [...DATASETS.map((row, index) => ({ ...row, colour: SOURCE_COLOURS[index] })), { ...NON_COFFEE, origin: NON_COFFEE.role, colour: SOURCE_COLOURS[5] }];
  const max = DATASETS[0].train;
  return (
    <div className="absolute left-[96px] top-[180px] w-[840px]">
      {rows.map((row, index) => {
        const shown = progress(frame, at + index * 5, 14);
        return (
          <div key={row.name} className="mb-5 grid grid-cols-[300px_1fr] items-center gap-6" style={{ opacity: shown, translate: `${(1 - shown) * -40}px 0` }}>
            <div>
              <p className="text-label font-bold text-text">{row.name}</p>
              <p className="text-fineprint text-text-muted">
                {row.origin}, {row.licence}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-[30px]" style={{ width: (row.train / max) * 380 * progress(frame, at + 6 + index * 5, 22, glide), background: row.colour }} />
              <Counter to={row.train} at={at + 6 + index * 5} duration={22} className="font-data text-label text-text" />
            </div>
          </div>
        );
      })}
      <div className="mt-6 flex items-baseline gap-5" style={{ opacity: progress(frame, at + 30, 12) }}>
        <Counter to={SPLIT.train} at={at + 30} duration={30} className="display-headline text-figure text-text" />
        <span className="text-lead text-text-muted">training images</span>
      </div>
    </div>
  );
}

const COLUMN_GAP = 34;
const DOT = 11;
const COLUMNS = [
  { key: "train", label: "Train", images: SPLIT.train, perRow: 28 },
  { key: "val", label: "Validation", images: SPLIT.val, perRow: 16 },
  { key: "test", label: "Test", images: SPLIT.test, perRow: 16 },
] as const;

function columnLayout() {
  let x = 1000;
  return COLUMNS.map((column) => {
    const layout = { ...column, x, width: column.perRow * DOT };
    x += layout.width + COLUMN_GAP;
    return layout;
  });
}

function GroupDots({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(31);
  const columns = columnLayout();
  return (
    <div className="absolute inset-0">
      {columns.map((column, columnIndex) => {
        const data = groups[column.key];
        const shown = progress(frame, at + columnIndex * 6, 12);
        return (
          <div key={column.key}>
            <div className="absolute" style={{ left: column.x, top: 180, opacity: shown }}>
              <p className="text-label font-bold text-text">{column.label}</p>
              <p className="font-data text-ui text-text-muted figures">{column.images.toLocaleString("en-US")} images</p>
              <p className="font-data text-ui text-text-muted figures">{data.groups.toLocaleString("en-US")} groups</p>
            </div>
            {columnIndex > 0 && <div className="absolute w-[2px] bg-text-faint" style={{ left: column.x - COLUMN_GAP / 2, top: 180, height: 560 * shown }} />}
            {data.dots.map((source, index) => {
              const delay = at + 4 + random() * 34;
              const settle = progress(frame, delay, 18, glide);
              const tx = column.x + (index % column.perRow) * DOT;
              const ty = 320 + Math.floor(index / column.perRow) * DOT;
              const fromX = 520 + random() * 300;
              return (
                <span
                  key={index}
                  className="absolute rounded-full"
                  style={{ left: fromX + (tx - fromX) * settle, top: 420 + (ty - 420) * settle, width: DOT - 3, height: DOT - 3, background: SOURCE_COLOURS[source], opacity: settle > 0 ? 0.95 : 0 }}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function LeakCheck({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  const total = groups.train.groups + groups.val.groups + groups.test.groups;
  return (
    <div className="absolute left-[1000px] top-[760px] w-[820px]" style={{ opacity: shown, translate: `0 ${(1 - shown) * 20}px` }}>
      <p className="flex items-center gap-3 text-lead font-bold text-live">
        <CheckCircle size={40} weight="fill" /> 0 of {total.toLocaleString("en-US")} groups cross a split
      </p>
      <p className="mt-2 text-ui text-text-muted">
        A group joins exact duplicates, look-alike hashes, crops of one photo and one plant’s leaves. One dot is {groups.perDot} groups.
      </p>
    </div>
  );
}

/** Part 2 opens on the network itself, then the data it learned from and how the splits keep plants apart. */
export function Data() {
  const frame = useCurrentFrame();
  const dataAt = wordAt("data", "fine-tuned") + 8;
  const splitAt = wordAt("data", "split");
  const sweep = between(frame, [dataAt - 10, dataAt + 6], [0, 1], glide);
  return (
    <AbsoluteFill className="bg-night">
      <PartHeading part={2} title="Classify coffee plant images" />
      <Architecture exitAt={dataAt - 12} />
      {sweep > 0 && <DatasetRows at={dataAt} />}
      {frame >= splitAt - 6 && <GroupDots at={splitAt - 6} />}
      <LeakCheck at={wordAt("data", "leak")} />
    </AbsoluteFill>
  );
}
