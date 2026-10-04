import { ArrowRight, Bell, NavigationArrow, UserCheck } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PartHeading } from "../components/PartHeading";
import { ALERTS, HOTSPOTS } from "../data/facts";
import { glide, progress } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";

const MAP = { x: 96, y: 170, width: 900, height: 740, pxPerMetre: 6 };
const DISEASE_COLOURS = { rust: "var(--color-rust-class)", cercospora: "var(--color-cercospora)", miner: "var(--color-miner)" } as const;
type Disease = keyof typeof DISEASE_COLOURS;

const CLUSTERS: { disease: Disease; cx: number; cy: number; count: number }[] = [
  { disease: "rust", cx: 300, cy: 260, count: 6 },
  { disease: "rust", cx: 640, cy: 520, count: 4 },
  { disease: "cercospora", cx: 700, cy: 210, count: 3 },
  { disease: "miner", cx: 250, cy: 560, count: 2 },
  { disease: "rust", cx: 470, cy: 650, count: 1 },
];

function sightings() {
  const random = seededRandom(12);
  return CLUSTERS.flatMap((cluster, clusterIndex) =>
    Array.from({ length: cluster.count }, () => ({
      clusterIndex,
      x: cluster.cx + (random() - 0.5) * 18 * MAP.pxPerMetre,
      y: cluster.cy + (random() - 0.5) * 18 * MAP.pxPerMetre,
      delay: random() * 30,
    })),
  );
}
const SIGHTINGS = sightings();

function FarmMap({ mergeAt }: { mergeAt: number }) {
  const frame = useCurrentFrame();
  const merge = progress(frame, mergeAt, 20, glide);
  return (
    <div className="absolute overflow-hidden bg-night-raised" style={{ left: MAP.x, top: MAP.y, width: MAP.width, height: MAP.height }}>
      <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(var(--color-night-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-night-line) 1px, transparent 1px)", backgroundSize: `${25 * MAP.pxPerMetre}px ${25 * MAP.pxPerMetre}px`, opacity: 0.6 }} />
      {CLUSTERS.map((cluster, index) => {
        const radius = (22 + cluster.count * 9) * merge;
        return (
          <div key={index} className="absolute flex items-center justify-center rounded-full" style={{ left: cluster.cx, top: cluster.cy, width: radius * 2, height: radius * 2, translate: "-50% -50%", background: `color-mix(in srgb, ${DISEASE_COLOURS[cluster.disease]} 55%, transparent)`, boxShadow: `0 0 ${50 * merge}px ${DISEASE_COLOURS[cluster.disease]}` }}>
            <span className="font-data text-lead font-bold text-text figures" style={{ opacity: merge }}>
              {cluster.count}
            </span>
          </div>
        );
      })}
      {SIGHTINGS.map((sighting, index) => {
        const cluster = CLUSTERS[sighting.clusterIndex];
        const drop = progress(frame, 6 + sighting.delay, 10);
        const x = sighting.x + (cluster.cx - sighting.x) * merge;
        const y = sighting.y + (cluster.cy - sighting.y) * merge;
        return <span key={index} className="absolute size-[18px] rounded-full" style={{ left: x, top: y - (1 - drop) * 40, translate: "-50% -50%", opacity: drop * (1 - merge), background: DISEASE_COLOURS[cluster.disease], boxShadow: "0 0 0 3px var(--color-night-raised)" }} />;
      })}
      <div className="absolute bottom-6 left-6 flex items-end gap-3">
        <div className="h-[10px] bg-text" style={{ width: HOTSPOTS.linkMetres * MAP.pxPerMetre }} />
        <span className="font-data text-ui text-text">{HOTSPOTS.linkMetres} m</span>
      </div>
      <div className="absolute right-6 top-6 flex flex-col items-center text-text-muted">
        <NavigationArrow size={34} weight="fill" style={{ rotate: "45deg" }} />
        <span className="text-ui">N</span>
      </div>
      <p className="absolute left-6 top-6 text-ui text-text-muted">Simulated sightings, labelled as such in the app</p>
    </div>
  );
}

const WEEKS = [
  [1, 0, 1],
  [1, 1, 0],
  [2, 0, 1],
  [2, 1, 1],
  [3, 1, 0],
  [4, 1, 1],
  [5, 2, 1],
  [6, 2, 1],
];

function Trend({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const order: Disease[] = ["rust", "cercospora", "miner"];
  return (
    <div className="absolute left-[1080px] top-[170px] w-[740px]" style={{ opacity: progress(frame, at, 10) }}>
      <p className="text-label font-bold text-text">Sightings per week, last {HOTSPOTS.trendWeeks} weeks, simulated</p>
      <div className="mt-4 flex h-[250px] items-end gap-5">
        {WEEKS.map((week, index) => {
          const grow = progress(frame, at + index * 3, 16, glide);
          return (
            <div key={index} className="flex w-[66px] flex-col-reverse">
              {week.map((count, disease) => (
                <div key={disease} style={{ height: count * 24 * grow, background: DISEASE_COLOURS[order[disease]] }} />
              ))}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-ui text-text-muted">
        Rechecks within {HOTSPOTS.repeatMinutes} min and {HOTSPOTS.repeatMetres} m count once. Empty ground means unchecked, not healthy.
      </p>
    </div>
  );
}

function AlertFlow({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const steps = [
    { icon: Bell, title: `${ALERTS.farms} farms, same area and disease, ${ALERTS.days} days`, note: "Builds a draft alert" },
    { icon: UserCheck, title: "Officer edits and approves", note: "Nothing is sent before this" },
  ];
  return (
    <div className="absolute left-[1080px] top-[600px] w-[760px]">
      <div className="flex items-center gap-4">
        {steps.map((step, index) => {
          const shown = progress(frame, at + index * 10, 12);
          const Glyph = step.icon;
          return (
            <div key={step.title} className="flex items-center gap-4" style={{ opacity: shown }}>
              {index > 0 && <ArrowRight size={36} weight="bold" className="text-text-faint" />}
              <div className="w-[320px] rounded-lg bg-night-high p-5" style={{ boxShadow: index === 1 ? "0 0 0 2px var(--color-live)" : undefined }}>
                <Glyph size={40} weight="bold" className={index === 1 ? "text-live" : "text-text"} />
                <p className="mt-2 text-label font-bold text-text">{step.title}</p>
                <p className="text-ui text-text-muted">{step.note}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-lg bg-lcd p-5" style={{ opacity: progress(frame, at + 26, 12) }}>
        <p className="font-data text-ui text-lcd-ink">Leaf alert for Karima: 3 farms near you reported coffee leaf rust in the last 7 days. … Text ALERTS OFF to stop these alerts.</p>
      </div>
    </div>
  );
}

/** Part 4: sightings pooling into hotspots on an offline map, a weekly trend, and alerts a person approves. */
export function Hotspots() {
  return (
    <AbsoluteFill className="bg-night">
      <PartHeading part={4} title="Map disease hotspots and trends" />
      <FarmMap mergeAt={wordAt("hotspots", "merge")} />
      <Trend at={wordAt("hotspots", "hotspots") - 10} />
      <AlertFlow at={wordAt("hotspots", "officer") - 10} />
    </AbsoluteFill>
  );
}
