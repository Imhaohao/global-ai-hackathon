import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Footage } from "../components/Footage";
import { Stat } from "../components/Stat";
import { leave, progress, settle } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.chaos.from;
const length = SCENES.chaos.to - start;

type TileProps = { at: number; x: number; y: number; tilt: number; children: React.ReactNode; width: number };

/** A window of the problem landing on the pile: it drops in tilted and keeps drifting while the pile grows. */
function Tile({ at, x, y, tilt, width, children }: TileProps) {
  const frame = useCurrentFrame();
  const land = progress(frame, at, 14, settle);
  const drift = interpolate(frame, [at, length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const crush = progress(frame, length - 9, 9, leave);
  return (
    <div
      className="absolute overflow-hidden rounded-[28px]"
      style={{
        left: x,
        top: y,
        width,
        opacity: land * (1 - crush),
        translate: `${(1 - land) * 260 + drift * 18}px ${drift * -10 + crush * 40}px`,
        rotate: `${tilt * (1 + (1 - land) * 2)}deg`,
        scale: 1 - crush * 0.08,
        boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
      }}
    >
      {children}
    </div>
  );
}

/** The access gap as a pile-up: basic phones, few officers, all landing faster than help can. Then it cuts to black. */
export function Chaos() {
  const frame = useCurrentFrame();
  const local = (abs: number) => abs - start;
  const fade = 1 - progress(frame, length - 6, 6, leave);
  return (
    <AbsoluteFill className="bg-night">
      <AbsoluteFill style={{ opacity: fade }}>
        <Sequence durationInFrames={40} layout="none">
          <Footage src="video/highlands.mp4" zoom={[1.02, 1.08]} shade={0.2} />
        </Sequence>
        <Sequence from={34} layout="none">
          <AbsoluteFill style={{ opacity: progress(frame, 34, 8) }}>
            <Footage src="video/coffee-rain.mp4" zoom={[1.1, 1.2]} shade={0.55} rate={0.72} />
          </AbsoluteFill>
        </Sequence>
        <div className="absolute left-[140px] top-[250px]">
          <Stat value="38%" label="of rural Kenyan adults use a basic phone as their main phone" source="World Bank Global Findex, 2024 survey" at={local(cue("phones", "four"))} />
        </div>
        <Tile at={local(cue("phones", "basic"))} x={1080} y={150} tilt={-4} width={640}>
          <OffthreadVideo src={staticFile("video/basic-phone.mp4")} muted className="block h-[360px] w-full object-cover" />
        </Tile>
        <Tile at={local(cue("phones", "extension"))} x={1180} y={560} tilt={3} width={600}>
          <div className="bg-paper-raised px-10 py-9 text-ink">
            <div className="display-poster figures text-title">1 : 600</div>
            <div className="mt-3 text-label">Kenya's target ratio of extension officers to farmers, for 2029. The ratio has not improved.</div>
            <div className="mt-3 text-fine text-ink-muted">Kenya Agricultural Sector Extension Policy, 2023</div>
          </div>
        </Tile>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
