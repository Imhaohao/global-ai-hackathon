import { ChatText, MapTrifold, Plant, ScanSmiley } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import { Spore } from "../components/Spore";
import { Wordmark } from "../components/Wordmark";
import { EXTENSION_TARGET } from "../data/facts";
import { between, glide, leave, progress } from "../lib/ease";
import { beat, wordAt } from "../lib/timeline";

/** The intro starts at frame 0, before the voice, so its word cues add the hook's start. */
const hookWord = (text: string) => wordAt("hook", text) + beat("hook").from;

const EARTH_RATE = 1.2;
const EARTH_FRAMES = Math.floor(96 / EARTH_RATE);

/** One frame of the dive: a photo that fades in, keeps pushing toward a point, and fades into the next. */
function DiveLayer({ src, from, to, origin, zoom }: { src: string; from: number; to: number; origin: string; zoom: [number, number] }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(progress(frame, from, 6), 1 - progress(frame, to - 6, 6, leave));
  if (opacity <= 0) return null;
  const scale = between(frame, [from, to], zoom, glide);
  return <Img src={staticFile(src)} className="absolute inset-0 size-full object-cover" style={{ opacity, scale: String(scale), transformOrigin: origin }} />;
}

function OfficerRatio({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const at = hookWord("one") + 12;
  const shown = progress(frame, at, 12) - progress(frame, exitAt, 8, leave);
  return (
    <AbsoluteFill style={{ opacity: shown }}>
    <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgb(0 0 0 / 0.85), rgb(0 0 0 / 0.5) 45%, transparent 75%)" }} />
    <div className="absolute left-[110px] top-[300px]" style={{ translate: `0 ${(1 - progress(frame, at, 12)) * 30}px` }}>
      <p className="display-poster text-poster text-text">1 officer</p>
      <p className="display-headline text-headline text-text">
        per <Counter to={EXTENSION_TARGET.farmers} at={at} duration={22} className="text-rust-glow rust-glow" /> farmers
      </p>
      <p className="mt-6 max-w-[560px] text-ui text-text-muted">Kenya’s target for {EXTENSION_TARGET.year}, from its 2023 agricultural extension policy</p>
    </div>
    </AbsoluteFill>
  );
}

const PARTS: { n: number; title: string; icon: Icon }[] = [
  { n: 1, title: "Buy and audit planting material", icon: Plant },
  { n: 2, title: "Classify coffee plant images", icon: ScanSmiley },
  { n: 3, title: "Deliver actionable help and trusted inputs", icon: ChatText },
  { n: 4, title: "Map disease hotspots and trends", icon: MapTrifold },
];

function SystemRow({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const line = progress(frame, at, 30, glide);
  return (
    <div className="absolute inset-x-[150px] top-[640px]">
      <div className="absolute left-[60px] right-[60px] top-[44px] h-[2px] bg-night-line">
        <div className="h-full bg-live" style={{ width: `${line * 100}%` }} />
        <Spore x={line * 1500} y={1} size={30} opacity={line > 0 && line < 1 ? 1 : 0} />
      </div>
      <div className="relative grid grid-cols-4 gap-10">
        {PARTS.map((part, index) => {
          const shown = progress(frame, at + index * 7, 14);
          const Glyph = part.icon;
          return (
            <div key={part.n} className="flex flex-col items-center gap-4 text-center" style={{ opacity: shown, translate: `0 ${(1 - shown) * 24}px` }}>
              <div className="flex size-[90px] items-center justify-center rounded-full bg-night-high text-live" style={{ boxShadow: "0 0 0 2px var(--color-live)" }}>
                <Glyph size={44} weight="regular" />
              </div>
              <p className="display-headline text-title text-live figures">{part.n}</p>
              <p className="text-label font-bold text-text">{part.title}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandReveal({ rowAt }: { rowAt: number }) {
  const frame = useCurrentFrame();
  const markAt = 0;
  const lift = progress(frame, rowAt - 6, 18, glide);
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute inset-0" style={{ background: "radial-gradient(55% 45% at 50% 40%, color-mix(in srgb, var(--brand-rust) 18%, transparent), transparent 70%)" }} />
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 330 - lift * 190 }}>
        <Wordmark at={markAt} size={1 - lift * 0.3} />
      </div>
      <SystemRow at={rowAt} />
    </AbsoluteFill>
  );
}

function Flash({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const opacity = Math.min(progress(frame, at - 5, 5), 1 - progress(frame, at, 12));
  return <AbsoluteFill style={{ background: "#fff6e6", opacity }} />;
}

/** Earth at night over Kenya, a dive through a rusted leaf to its spores, then the name and the four parts. */
export function Intro() {
  const revealAt = hookWord("Leaf") + 2;
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={EARTH_FRAMES + 8}>
        <EarthShot />
      </Sequence>
      <DiveLayer src="media/rust-leaf-underside.jpg" from={EARTH_FRAMES - 6} to={EARTH_FRAMES + 16} origin="58% 42%" zoom={[1, 1.8]} />
      <DiveLayer src="media/pustules-macro.jpg" from={EARTH_FRAMES + 10} to={EARTH_FRAMES + 26} origin="50% 50%" zoom={[1, 1.4]} />
      <DiveLayer src="media/spores-cluster.jpg" from={EARTH_FRAMES + 20} to={revealAt + 4} origin="45% 50%" zoom={[1, 1.5]} />
      <OfficerRatio exitAt={EARTH_FRAMES + 16} />
      <Sequence from={revealAt}>
        <BrandReveal rowAt={hookWord("four-part") - revealAt} />
      </Sequence>
      <Flash at={revealAt} />
    </AbsoluteFill>
  );
}

function EarthShot() {
  const frame = useCurrentFrame();
  const push = between(frame, [EARTH_FRAMES - 14, EARTH_FRAMES + 6], [1, 2.4], glide);
  return (
    <OffthreadVideo
      src={staticFile("media/earth-intro.mp4")}
      muted
      playbackRate={EARTH_RATE}
      className="absolute inset-0 size-full object-cover"
      style={{ scale: String(push), transformOrigin: "62% 78%" }}
    />
  );
}
