import { AirplaneTilt } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import { Phone } from "../components/Phone";
import focus from "../../public/analysis/rustfocus.json";
import tiles from "../../public/analysis/tiles.json";
import { SPLIT } from "../data/facts";
import { glide, leave, progress, snap } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";

const CLASS_COLOURS: Record<string, string> = {
  healthy: "var(--color-healthy)",
  rust: "var(--color-rust-class)",
  cercospora: "var(--color-cercospora)",
  miner: "var(--color-miner)",
  phoma: "var(--color-phoma)",
};
const CLASSES = ["healthy", "rust", "cercospora", "miner", "phoma"];
const TILE = 170;

/** Real training leaves landing in one row per disease, each row tagged with its label colour. */
function LabelledLeaves({ at, exitAt }: { at: number; exitAt: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(9);
  const exit = progress(frame, exitAt, 12, leave);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div className="absolute left-[120px] top-[60px] flex items-baseline gap-6" style={{ opacity: progress(frame, at, 10) }}>
        <Counter to={SPLIT.train} at={at} duration={40} className="display-poster text-poster text-text" />
      </div>
      {tiles.map((tile) => {
        const row = CLASSES.indexOf(tile.label);
        const column = tiles.filter((other) => other.label === tile.label && other.n < tile.n).length;
        const land = progress(frame, at + 4 + random() * 34, 18, glide);
        const fromX = 960 + (random() - 0.5) * 1800;
        const tx = 420 + column * (TILE + 10);
        const ty = 310 + row * (TILE * 0.6 + 10);
        return (
          <Img
            key={tile.n}
            src={staticFile(`analysis/tiles/${tile.n}.jpg`)}
            className="absolute object-cover"
            style={{ left: fromX + (tx - fromX) * land, top: -200 + (ty + 200) * land, width: TILE, height: TILE * 0.6, rotate: `${(1 - land) * (random() - 0.5) * 60}deg`, opacity: land > 0 ? 1 : 0, boxShadow: `inset 0 0 0 0 transparent, 0 0 0 3px ${CLASS_COLOURS[tile.label]}` }}
          />
        );
      })}
      {CLASSES.map((label, row) => (
        <p key={label} className="absolute display-headline text-title" style={{ left: 120, top: 310 + row * (TILE * 0.6 + 10) + 22, color: CLASS_COLOURS[label], opacity: progress(frame, at + 30 + row * 4, 10) }}>
          {label}
        </p>
      ))}
    </AbsoluteFill>
  );
}

/** The model's real map on a held-out rust leaf: the leaf dims, the rust spot it found lights, then the answer. */
function Finding({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  const heat = progress(frame, at + 12, 22);
  const answer = progress(frame, wordAt("scan", "names") - 6, 12, snap);
  const mask = `url(${staticFile("analysis/focus-heat.png")})`;
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <div className="absolute left-[140px] top-[110px] size-[860px] overflow-hidden" style={{ boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1)" }}>
        <Img src={staticFile("analysis/focus-leaf.png")} className="absolute inset-0 size-full" style={{ filter: `saturate(${1 - heat * 0.7}) brightness(${1 - heat * 0.6})`, scale: String(1 + heat * 0.05) }} />
        <Img src={staticFile("analysis/focus-leaf.png")} className="absolute inset-0 size-full" style={{ opacity: heat, scale: String(1 + heat * 0.05), maskImage: mask, maskSize: "100% 100%", WebkitMaskImage: mask, WebkitMaskSize: "100% 100%", filter: "brightness(1.3) saturate(1.3)" }} />
      </div>
      <div data-box="answer" className="absolute left-[1080px] right-[80px] top-[400px]" style={{ opacity: answer, translate: `${(1 - answer) * 40}px 0` }}>
        <p className="display-poster text-figure text-text">Coffee leaf rust</p>
        <p className="mt-4 font-data text-headline figures" style={{ color: "var(--color-rust-class)" }}>
          {focus.chosen.probability.toFixed(2)}
        </p>
      </div>
    </AbsoluteFill>
  );
}

/** Explanation: the weekend smartphone check, what the model learned from, and what it finds on a real leaf. */
export function Scan() {
  const frame = useCurrentFrame();
  const offlineAt = wordAt("scan", "offline");
  const dataAt = wordAt("scan", "Twenty") - 6;
  const findAt = wordAt("scan", "so") - 6;
  const phoneOut = progress(frame, dataAt - 8, 12, leave);
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute inset-0" style={{ opacity: 1 - phoneOut, translate: `${-phoneOut * 300}px 0` }}>
        <Phone src="rec/scan.mp4" height={960} startFrom={2.9} playbackRate={0.6} className="left-[740px] top-[60px]" videoStyle={{ scale: "1.9", transformOrigin: "50% 38%" }} />
        <div className="absolute left-[1240px] top-[460px] flex items-center gap-4 text-live" style={{ opacity: progress(frame, offlineAt, 12) }}>
          <AirplaneTilt size={84} weight="fill" />
          <span className="display-headline text-headline">Offline</span>
        </div>
      </div>
      {frame >= dataAt && <LabelledLeaves at={dataAt} exitAt={findAt - 10} />}
      {frame >= findAt && <Finding at={findAt} />}
    </AbsoluteFill>
  );
}
