import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { RevealLines } from "../../../components/RevealLines";
import { ScanBar } from "../../../components/ScanBar";
import { scatterSpores, Spore, SporeField } from "../../../components/Spore";
import { StageFrames } from "../../../components/StageFrames";
import { FloorShade, Vignette } from "../../../components/Surface";
import { glide, mix, progress } from "../../../lib/ease";
import { wordAt } from "../timeline";

/** Frames of the shared 3D stage's rust leaf, rendered vertically from a copy of the .blend. */
export const STAGE_LEAF_FRAMES = 34;
export const REVEAL = { from: 22, duration: 20 } as const;

const RUST_SPOTS = scatterSpores(3, 30, { x: 140, y: 700, width: 860, height: 520 }, [12, 30], 50);
const word = (text: string) => wordAt("gap", text);
const noorFrom = word("but") - 6;

/** Opens on the brand's 3D rust leaf; a scan line sweeps down and leaves the real photograph behind it. */
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
  return (
    <div className="absolute inset-0 bg-night">
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 ${(1 - progress(frame, REVEAL.from, REVEAL.duration, glide)) * 100}% 0)` }}>
        <Photo src="images/rust-underside.jpg" from={{ scale: 1.08 }} to={{ scale: 1.42, x: -20, y: 30 }} duration={length} origin="60% 32%" style={{ objectPosition: "84% 34%" }} />
      </div>
      <StageToPhoto />
      <Vignette strength={0.55} />
      <SporeField points={RUST_SPOTS} at={REVEAL.from + 10} grow={16} />
      <div className="absolute inset-x-safe-side top-[700px]">
        <RevealLines lines={["Coffee", "leaf rust"]} at={word("disease") + 2} className="display-poster text-figure text-paper-raised [text-shadow:0_14px_60px_rgba(16,18,14,0.55)]" />
      </div>
      <div className="absolute inset-x-safe-side top-[240px]">
        <FinePrint at={REVEAL.from + REVEAL.duration} tone="light">
          Rust powder under a coffee leaf. Photo by Smartse, CC BY-SA 3.0.
        </FinePrint>
      </div>
    </div>
  );
}

const BEAM = { x: 640, top: 120, stopsAt: 560, noorAt: 760 } as const;

/** Help falling toward Noor as a line of light that runs out before it reaches her. */
function FallingShort({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const fall = progress(frame, at, 30, glide);
  const fade = progress(frame, at + 34, 20);
  const end = mix(BEAM.top, BEAM.stopsAt, fall);
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden style={{ opacity: 1 - fade * 0.3 }}>
        <defs>
          <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1={BEAM.x} y1={BEAM.top} x2={BEAM.x} y2={BEAM.stopsAt}>
            <stop offset="0" stopColor="#fff1d9" stopOpacity="0.95" />
            <stop offset="1" stopColor="#f0641e" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <line x1={BEAM.x} y1={BEAM.top} x2={BEAM.x} y2={end} stroke="url(#beam)" strokeWidth={10} strokeLinecap="round" strokeDasharray="3 20" />
      </svg>
      {fall > 0 && <Spore x={BEAM.x} y={end} size={36 * (1 - fade) + 8} opacity={1 - fade} />}
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden style={{ opacity: progress(frame, at + 26, 14) * 0.7 }}>
        <line x1={BEAM.x} y1={BEAM.stopsAt + 50} x2={BEAM.x} y2={BEAM.noorAt} stroke="#f7f5f0" strokeWidth={4} strokeDasharray="12 16" opacity={0.6} />
      </svg>
    </>
  );
}

function Noor({ length }: { length: number }) {
  const local = (text: string) => word(text) - noorFrom;
  return (
    <Punch flash={0.4}>
      <Photo src="images/noor-slope.jpg" from={{ scale: 1.16, y: 20 }} to={{ scale: 1.02, y: -10 }} duration={length} origin="45% 40%" />
      <FloorShade strength={0.45} from={50} />
      <FallingShort at={local("rarely") - 8} />
      <div className="absolute left-safe-side bottom-[600px]">
        <RevealLines lines={["Noor"]} at={local("noor")} className="display-poster text-figure text-paper-raised [text-shadow:0_12px_50px_rgba(16,18,14,0.5)]" />
        <FinePrint at={local("noor") + 10} tone="light" className="max-w-[640px]">
          Noor is a fictional farmer from the hackathon brief, and this picture of her was made with AI.
        </FinePrint>
      </div>
    </Punch>
  );
}


export function GapScene({ length }: { length: number }) {
  return (
    <>
      <Sequence durationInFrames={noorFrom} layout="none">
        <Macro length={noorFrom} />
      </Sequence>
      <Sequence from={noorFrom} durationInFrames={length - noorFrom} layout="none">
        <Noor length={length - noorFrom} />
      </Sequence>
    </>
  );
}
