import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { ScanBar } from "../../../components/ScanBar";
import { StageFrames } from "../../../components/StageFrames";
import { Punch } from "../../../components/Punch";
import { RevealLines } from "../../../components/RevealLines";
import { scatterSpores, Spore, SporeField } from "../../../components/Spore";
import { FloorShade, Vignette } from "../../../components/Surface";
import { glide, progress, mix } from "../../../lib/ease";
import { seededRandom } from "../../../lib/seeded";
import { wordAt } from "../timeline";

const RUST_SPOTS = scatterSpores(3, 30, { x: 140, y: 700, width: 860, height: 520 }, [12, 30], 50);

const KIAMBU_LANDINGS = scatterSpores(9, 18, { x: 120, y: 520, width: 860, height: 640 }, [14, 26], 26);

type Drift = { x: number; y: number; size: number; delay: number; drift: number };

const random = seededRandom(17);
const DRIFTING: Drift[] = Array.from({ length: 34 }, () => ({
  x: 140 + random() * 860,
  y: 700 + random() * 520,
  size: 8 + random() * 14,
  delay: Math.round(random() * 22),
  drift: 0.6 + random() * 0.8,
}));

function Rain({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const strength = progress(frame, at, 12);
  const streaks = Array.from({ length: 46 }, (_, index) => {
    const lane = seededRandom(index + 40);
    const x = lane() * 1300 - 100;
    const speed = 70 + lane() * 50;
    const y = ((frame * speed + lane() * 1920) % 2300) - 200;
    return { x: x - y * 0.18, y, length: 90 + lane() * 120, key: index };
  });
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" style={{ opacity: strength * 0.55 }} aria-hidden>
      {streaks.map((streak) => (
        <line key={streak.key} x1={streak.x} y1={streak.y} x2={streak.x - streak.length * 0.18} y2={streak.y + streak.length} stroke="#eef2ea" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      ))}
    </svg>
  );
}

function CarriedSpores({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {DRIFTING.map((spore, index) => {
        const travel = progress(frame, at + spore.delay, 40, glide);
        if (travel <= 0 || travel >= 1) return null;
        const x = mix(spore.x, spore.x - 520 * spore.drift, travel);
        const y = mix(spore.y, spore.y + 1300 * spore.drift, travel);
        return <Spore key={index} x={x} y={y} size={spore.size} opacity={1 - travel * 0.6} />;
      })}
    </>
  );
}

/** Frames of the shared 3D stage's rust leaf, rendered vertically from a copy of the .blend. */
export const STAGE_LEAF_FRAMES = 34;
const REVEAL = { from: 22, duration: 20 } as const;

/** Opens on the brand's 3D rust leaf, then a scan line sweeps down and leaves the real photograph behind it. */
function StageToPhoto() {
  const frame = useCurrentFrame();
  const swept = progress(frame, REVEAL.from, REVEAL.duration, glide);
  return (
    <>
      <div className="absolute inset-0" style={{ clipPath: `inset(${swept * 100}% 0 0 0)`, opacity: progress(frame, 0, 8) }}>
        <StageFrames folder="images/stage-leaf" name="leaf" count={STAGE_LEAF_FRAMES} />
      </div>
      {swept > 0 && swept < 1 && <ScanBar at={swept} />}
    </>
  );
}

function Macro({ length }: { length: number }) {
  const frame = useCurrentFrame();
  const titleAt = wordAt("hook", "rust") + 4;
  return (
    <div className="absolute inset-0 bg-night">
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${(1 - progress(frame, REVEAL.from, REVEAL.duration, glide)) * 100}% 0)` }}>
        <Photo src="images/rust-underside.jpg" from={{ scale: 1.08 }} to={{ scale: 1.42, x: -20, y: 30 }} duration={length} origin="60% 32%" style={{ objectPosition: "84% 34%" }} />
      </div>
      <StageToPhoto />
      <Vignette strength={0.55} />
      <SporeField points={RUST_SPOTS} at={REVEAL.from + 10} grow={16} />
      <Rain at={wordAt("hook", "rain") - 4} />
      <CarriedSpores at={wordAt("hook", "carries")} />
      <div className="absolute inset-x-safe-side top-[700px]">
        <RevealLines lines={["Coffee", "leaf rust"]} at={titleAt} className="display-poster text-figure text-paper-raised [text-shadow:0_14px_60px_rgba(16,18,14,0.55)]" />
      </div>
    </div>
  );
}

function TreeToTree() {
  return (
    <Punch>
      <Photo src="images/rust-kiambu.jpg" from={{ scale: 1.25, x: 40 }} to={{ scale: 1.12, x: -40 }} duration={40} style={{ objectPosition: "38% 50%" }} />
      <FloorShade strength={0.6} from={60} />
      <SporeField points={KIAMBU_LANDINGS} at={2} grow={10} />
      <div className="absolute inset-x-safe-side top-[240px]">
        <FinePrint at={4} tone="light">
          Coffee leaves with rust in Kiambu, Kenya. Photo by Daniel Case, CC BY-SA 4.0.
        </FinePrint>
      </div>
    </Punch>
  );
}

export function HookScene({ length }: { length: number }) {
  const cutAt = wordAt("hook", "tree") - 2;
  return (
    <>
      <Sequence durationInFrames={cutAt} layout="none">
        <Macro length={cutAt} />
        <div className="absolute inset-x-safe-side top-[240px]">
          <FinePrint at={REVEAL.from + REVEAL.duration} tone="light">
            Rust powder under a coffee leaf. Photo by Smartse, CC BY-SA 3.0.
          </FinePrint>
        </div>
      </Sequence>
      <Sequence from={cutAt} durationInFrames={length - cutAt} layout="none">
        <TreeToTree />
      </Sequence>
    </>
  );
}
