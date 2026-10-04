import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import analysis from "../data/analysis.json";
import { between, glide, leave, progress } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";

const CLASS_COLOURS: Record<string, string> = {
  healthy: "var(--color-healthy)",
  rust: "var(--color-rust-class)",
  cercospora: "var(--color-cercospora)",
  miner: "var(--color-miner)",
  phoma: "var(--color-phoma)",
};

function Spores({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, 0, 12) - progress(frame, exitAt, 12, leave);
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <Img src={staticFile("media/spores-pair.jpg")} className="size-full object-cover" style={{ scale: String(between(frame, [0, exitAt], [1.05, 1.25], glide)) }} />
      <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 50%, rgb(0 0 0 / 0.65))" }} />
      <p className="absolute right-[120px] top-[440px] display-headline text-figure text-rust-glow rust-glow" style={{ opacity: progress(frame, wordAt("biology", "orange") - 4, 12) }}>
        Carotenoids
      </p>
    </AbsoluteFill>
  );
}

const LESIONS = [4, 5, 6];

function Lesions({ at, exitAt }: { at: number; exitAt: number }) {
  const frame = useCurrentFrame();
  const exit = progress(frame, exitAt, 12, leave);
  return (
    <div className="absolute left-[150px] top-[230px] flex gap-12" style={{ opacity: 1 - exit }}>
      {LESIONS.map((cam, index) => {
        const shown = progress(frame, at + index * 7, 14);
        return <Img key={cam} src={staticFile(`analysis/cam-${cam}.png`)} className="size-[500px] object-cover" style={{ opacity: shown, translate: `0 ${(1 - shown) * 60}px`, boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1)" }} />;
      })}
    </div>
  );
}

const PLOT = { x: 140, y: 170, size: 700, a: [-32, 2], b: [14, 60] };
const toX = (a: number) => PLOT.x + ((a - PLOT.a[0]) / (PLOT.a[1] - PLOT.a[0])) * PLOT.size;
const toY = (b: number) => PLOT.y + PLOT.size - ((b - PLOT.b[0]) / (PLOT.b[1] - PLOT.b[0])) * PLOT.size;

/** Real lesion colours from the training crops: each class drifts to its own corner of CIELAB, but the clouds overlap. */
function ColourCloud({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(5);
  return (
    <div className="absolute inset-0" style={{ opacity: progress(frame, at, 10) }}>
      <div className="absolute" style={{ left: PLOT.x, top: PLOT.y, width: PLOT.size, height: PLOT.size, boxShadow: "inset 0 0 0 1px var(--color-night-line)" }} />
      {Object.entries(analysis.scatter).flatMap(([label, points]) =>
        points.map((point, index) => {
          const settle = progress(frame, at + 2 + random() * 30, 18, glide);
          const outside = point.a < PLOT.a[0] || point.a > PLOT.a[1] || point.b < PLOT.b[0] || point.b > PLOT.b[1];
          if (outside) return null;
          const cx = PLOT.x + PLOT.size / 2;
          const cy = PLOT.y + PLOT.size / 2;
          return <span key={`${label}-${index}`} className="absolute size-[10px] rounded-full" style={{ left: cx + (toX(point.a) - cx) * settle, top: cy + (toY(point.b) - cy) * settle, translate: "-50% -50%", background: CLASS_COLOURS[label], opacity: 0.8 * settle }} />;
        }),
      )}
    </div>
  );
}

function Bar({ value, at, lit, label }: { value: number; at: number; lit: boolean; label: string }) {
  const frame = useCurrentFrame();
  const grow = progress(frame, at, 28, glide);
  return (
    <div style={{ opacity: progress(frame, at, 8) }}>
      <p className="text-lead font-bold text-text-muted">{label}</p>
      <div className="mt-3 flex items-center gap-6">
        <div className="h-[64px]" style={{ width: value * 5.2 * grow, background: lit ? "var(--color-live)" : "var(--color-text-faint)" }} />
        <Counter to={value} at={at} duration={28} suffix="%" className={`display-headline text-figure ${lit ? "text-live" : "text-text"}`} />
      </div>
    </div>
  );
}

/** A real LayerCAM map on a held-out rust crop: the pustules light up, the healthy green dims. */
function HeatLeaf({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  const heat = progress(frame, at + 10, 24);
  const mask = `url(${staticFile("analysis/cam-3-heat.png")})`;
  return (
    <div className="absolute left-[140px] top-[170px] size-[700px] overflow-hidden" style={{ opacity: shown, boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1)" }}>
      <Img src={staticFile("analysis/cam-3.png")} className="absolute inset-0 size-full" style={{ filter: `saturate(${1 - heat * 0.8}) brightness(${1 - heat * 0.65})` }} />
      <Img src={staticFile("analysis/cam-3.png")} className="absolute inset-0 size-full" style={{ opacity: heat, maskImage: mask, maskSize: "100% 100%", WebkitMaskImage: mask, WebkitMaskSize: "100% 100%", filter: "brightness(1.2) saturate(1.2)" }} />
      <p className="absolute bottom-6 left-6 rounded-sm bg-black/60 px-3 py-1 text-label font-bold text-text" style={{ opacity: heat }}>
        LayerCAM
      </p>
    </div>
  );
}

/** Explanation: why a fine-tuned network works, from the colours the diseases really make to the texture it adds. */
export function Biology() {
  const frame = useCurrentFrame();
  const lesionsAt = wordAt("biology", "dead") - 8;
  const colourAt = wordAt("biology", "Colour") - 6;
  const textureAt = wordAt("biology", "texture") - 6;
  const cloudOut = progress(frame, textureAt - 8, 10, leave);
  return (
    <AbsoluteFill className="bg-night">
      <Spores exitAt={lesionsAt - 2} />
      <Lesions at={lesionsAt} exitAt={colourAt - 8} />
      {frame >= colourAt && (
        <div className="absolute inset-0" style={{ opacity: 1 - cloudOut }}>
          <ColourCloud at={colourAt} />
        </div>
      )}
      {frame >= textureAt - 4 && <HeatLeaf at={textureAt - 4} />}
      <div className="absolute left-[980px] top-[330px] flex flex-col gap-14">
        {frame >= colourAt && <Bar label="Colour" value={analysis.colourOnly * 100} at={colourAt + 8} lit={false} />}
        {frame >= textureAt && <Bar label="+ Texture" value={analysis.b2SameImages * 100} at={textureAt + 4} lit />}
      </div>
    </AbsoluteFill>
  );
}
