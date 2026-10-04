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
  const shown = progress(frame, 0, 14) - progress(frame, exitAt, 12, leave);
  const zoom = between(frame, [0, exitAt], [1.08, 1.22], glide);
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <div className="absolute left-0 top-0 h-full w-[1060px] overflow-hidden">
        <Img src={staticFile("media/spores-pair.jpg")} className="size-full object-cover" style={{ scale: String(zoom) }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, transparent 60%, var(--color-night))" }} />
      </div>
      <div className="absolute left-[1120px] top-[250px] w-[700px]">
        <p className="display-headline text-headline text-text">Rust spores are orange from carotenoids</p>
        <p className="mt-6 text-lead text-text-muted">
          <i>Hemileia vastatrix</i> urediniospores carry carotenoid lipid droplets. They erupt as powder on the leaf’s underside, over yellow patches where chlorophyll has broken down.
        </p>
        <p className="mt-6 text-fineprint text-text-faint">Light micrograph: Carvalho et al., PLoS ONE 2011, CC BY 2.5</p>
      </div>
    </AbsoluteFill>
  );
}

const LESIONS = [
  { cam: 4, name: "Cercospora", note: "Grey-white centre, brown ring, yellow halo" },
  { cam: 5, name: "Leaf miner", note: "Larvae eat the palisade cells; the mine dies and browns" },
  { cam: 6, name: "Phoma", note: "Dark dead spots, worst in cold wind at altitude" },
];

function Lesions({ at, exitAt }: { at: number; exitAt: number }) {
  const frame = useCurrentFrame();
  const exit = progress(frame, exitAt, 12, leave);
  return (
    <div className="absolute left-[96px] top-[190px] flex gap-10" style={{ opacity: 1 - exit }}>
      {LESIONS.map((lesion, index) => {
        const shown = progress(frame, at + index * 6, 14);
        return (
          <div key={lesion.cam} className="w-[540px]" style={{ opacity: shown, translate: `0 ${(1 - shown) * 40}px` }}>
            <Img src={staticFile(`analysis/cam-${lesion.cam}.png`)} className="size-[540px] object-cover" style={{ boxShadow: "0 0 0 1px rgb(255 255 255 / 0.1)" }} />
            <p className="mt-5 text-title font-bold text-text display-headline">{lesion.name}</p>
            <p className="mt-1 text-label text-text-muted">{lesion.note}</p>
          </div>
        );
      })}
    </div>
  );
}

const PLOT = { x: 160, y: 200, size: 620, a: [-32, 2], b: [14, 60] };
const toX = (a: number) => PLOT.x + ((a - PLOT.a[0]) / (PLOT.a[1] - PLOT.a[0])) * PLOT.size;
const toY = (b: number) => PLOT.y + PLOT.size - ((b - PLOT.b[0]) / (PLOT.b[1] - PLOT.b[0])) * PLOT.size;

function ColourSpace({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(5);
  const frameShown = progress(frame, at, 12);
  return (
    <div className="absolute inset-0" style={{ opacity: frameShown }}>
      <div className="absolute" style={{ left: PLOT.x, top: PLOT.y, width: PLOT.size, height: PLOT.size, boxShadow: "inset 0 0 0 1px var(--color-night-line)" }} />
      <p className="absolute text-ui text-text-muted" style={{ left: PLOT.x, top: PLOT.y + PLOT.size + 14 }}>
        a* from green to red
      </p>
      <p className="absolute origin-top-left text-ui text-text-muted" style={{ left: PLOT.x - 46, top: PLOT.y + PLOT.size, rotate: "-90deg" }}>
        b* from blue to yellow
      </p>
      {Object.entries(analysis.scatter).map(([label, points]) =>
        points.map((point, index) => {
          const settle = progress(frame, at + 4 + random() * 26, 16, glide);
          const outside = point.a < PLOT.a[0] || point.a > PLOT.a[1] || point.b < PLOT.b[0] || point.b > PLOT.b[1];
          return outside ? null : (
            <span
              key={`${label}-${index}`}
              className="absolute rounded-full"
              style={{ left: PLOT.x + PLOT.size / 2 + (toX(point.a) - PLOT.x - PLOT.size / 2) * settle, top: PLOT.y + PLOT.size / 2 + (toY(point.b) - PLOT.y - PLOT.size / 2) * settle, width: 9, height: 9, translate: "-50% -50%", background: CLASS_COLOURS[label], opacity: 0.75 * settle }}
            />
          );
        }),
      )}
      <MedianMarks at={at + 30} />
      <p className="absolute w-[620px] text-label text-text" style={{ left: PLOT.x, top: PLOT.y + PLOT.size + 60, opacity: progress(frame, at + 40, 12) }}>
        Rust sits highest on yellow; healthy sits greenest. The clouds still overlap.
      </p>
      <p className="absolute w-[620px] text-fineprint text-text-faint" style={{ left: PLOT.x, top: PLOT.y - 56 }}>
        Mean CIELAB colour of {Object.values(analysis.lesion).reduce((sum, item) => sum + item.images, 0).toLocaleString("en-US")} expert-cropped BRACOL symptom photos, one dot per crop, measured by us
      </p>
    </div>
  );
}

/** Where each class's median label sits relative to its dot, so five close medians stay readable. */
const LABEL_OFFSETS: Record<string, { x: number; y: number; length: number; angle: number }> = {
  rust: { x: -150, y: -90, length: 150, angle: 211 },
  cercospora: { x: 190, y: -80, length: 170, angle: -25 },
  phoma: { x: 220, y: 10, length: 160, angle: 3 },
  miner: { x: 170, y: 100, length: 160, angle: 32 },
  healthy: { x: -150, y: 90, length: 150, angle: 149 },
};

function MedianMarks({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {Object.entries(analysis.lesion).map(([label, item], index) => {
        const shown = progress(frame, at + index * 3, 10);
        return (
          <div key={label} className="absolute" style={{ left: toX(item.median_a), top: toY(item.median_b), opacity: shown }}>
            <span className="absolute size-[24px] rounded-full" style={{ translate: "-50% -50%", background: CLASS_COLOURS[label], boxShadow: "0 0 0 3px var(--color-night)" }} />
            <span className="absolute h-[2px] origin-left" style={{ width: LABEL_OFFSETS[label].length, rotate: `${LABEL_OFFSETS[label].angle}deg`, background: CLASS_COLOURS[label] }} />
            <span className="absolute whitespace-nowrap rounded-sm bg-night/85 px-2 text-ui font-bold" style={{ left: LABEL_OFFSETS[label].x, top: LABEL_OFFSETS[label].y, translate: "-50% -50%", color: CLASS_COLOURS[label] }}>
              {label}
            </span>
          </div>
        );
      })}
    </>
  );
}

function Score({ label, value, at, lit }: { label: string; value: number; at: number; lit: boolean }) {
  const frame = useCurrentFrame();
  const grow = progress(frame, at, 26, glide);
  return (
    <div className="mb-8" style={{ opacity: progress(frame, at, 8) }}>
      <p className="text-label font-bold text-text">{label}</p>
      <div className="mt-3 flex items-center gap-5">
        <div className="h-[46px]" style={{ width: value * 6.2 * grow, background: lit ? "var(--color-live)" : "var(--color-text-faint)" }} />
        <Counter to={value} at={at} duration={26} decimals={1} suffix="%" className={`display-headline text-headline ${lit ? "text-live" : "text-text"}`} />
      </div>
    </div>
  );
}

const STATE_RING: Record<string, string> = { confident: "var(--color-live)", possible: "var(--brand-rust-glow)", unclear: "var(--color-text-faint)" };

function LeafTile({ leaf, at }: { leaf: (typeof analysis.leaves)[number]; at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 10);
  const heat = progress(frame, at + 8, 18);
  const mask = `url(${staticFile(`analysis/${leaf.image}-heat.png`)})`;
  return (
    <div style={{ opacity: shown }}>
      <div className="relative size-[120px] overflow-hidden" style={{ boxShadow: `0 0 0 3px ${STATE_RING[leaf.state]}` }}>
        <Img src={staticFile(`analysis/${leaf.image}.png`)} className="absolute inset-0 size-full" style={{ filter: `saturate(${1 - heat * 0.8}) brightness(${1 - heat * 0.7})` }} />
        <Img src={staticFile(`analysis/${leaf.image}.png`)} className="absolute inset-0 size-full" style={{ opacity: heat, maskImage: mask, maskSize: "100% 100%", WebkitMaskImage: mask, WebkitMaskSize: "100% 100%", filter: "brightness(1.15)" }} />
      </div>
      <p className="mt-1 text-fineprint text-text-muted">{leaf.predicted}</p>
      <p className="font-data text-fineprint text-text figures">{(Math.floor(leaf.probability * 100) / 100).toFixed(2)}</p>
    </div>
  );
}

const TRUTH_ORDER = ["healthy", "rust", "cercospora", "miner", "phoma"];

function LeafGrid({ at }: { at: number }) {
  return (
    <div className="absolute flex gap-4" style={{ top: 370 }}>
      {TRUTH_ORDER.map((truth, column) => (
        <div key={truth} className="flex w-[120px] flex-col gap-2">
          <p className="text-ui font-bold" style={{ color: CLASS_COLOURS[truth] }}>
            {truth}
          </p>
          {analysis.leaves
            .filter((leaf) => leaf.truth === truth)
            .map((leaf, row) => (
              <LeafTile key={leaf.image} leaf={leaf} at={at + column * 4 + row * 3} />
            ))}
        </div>
      ))}
    </div>
  );
}

function Scores({ colourAt, textureAt }: { colourAt: number; textureAt: number }) {
  const frame = useCurrentFrame();
  return (
    <div className="absolute left-[880px] top-[170px] w-[960px]">
      <Score label="Colour histogram only" value={analysis.colourOnly * 100} at={colourAt} lit={false} />
      <Score label="EfficientNet-B2: colour plus texture and shape" value={analysis.b2SameImages * 100} at={textureAt} lit />
      <p className="text-fineprint text-text-faint" style={{ opacity: progress(frame, colourAt + 10, 10) }}>
        Accuracy on the same {analysis.valImages.toLocaleString("en-US")} validation photos of five classes; colour model is logistic regression on CIELAB histograms
      </p>
      <div style={{ opacity: progress(frame, textureAt, 10) }}>
        <LeafGrid at={textureAt + 4} />
        <p className="absolute left-[700px] w-[250px] text-fineprint text-text-faint" style={{ top: 400 }}>
          Ten random held-out BRACOL leaves. Under each: the app’s B2 TFLite answer and calibrated score. Green ring: confident; amber: possible. Light: LayerCAM, stage 6, same published weights.
        </p>
      </div>
    </div>
  );
}

/** Why fine-tuning works: real colour biology in the data, then the texture a network adds on top of it. */
export function Biology() {
  const lesionsAt = wordAt("biology", "dead") - 6;
  const colourAt = wordAt("biology", "Colour") - 4;
  const textureAt = wordAt("biology", "texture") - 4;
  return (
    <AbsoluteFill className="bg-night">
      <Spores exitAt={lesionsAt - 4} />
      <Lesions at={lesionsAt} exitAt={colourAt - 8} />
      <ColourSpaceGate from={colourAt} />
      <Scores colourAt={colourAt + 6} textureAt={textureAt} />
    </AbsoluteFill>
  );
}

function ColourSpaceGate({ from }: { from: number }) {
  const frame = useCurrentFrame();
  return frame >= from ? <ColourSpace at={from} /> : null;
}
