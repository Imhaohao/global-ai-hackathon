import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { Words } from "../components/Words";
import { progress, window } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.orbit.from;

/** Night Earth from orbit, diving onto Kenya's coffee highlands while the first figure lands. */
export function Orbit() {
  const frame = useCurrentFrame();
  const third = cue("access", "third") - start;
  const length = SCENES.orbit.to - start;
  const shown = window(frame, third, length + 6, 8, 10);
  return (
    <AbsoluteFill className="bg-black">
      <OffthreadVideo src={staticFile("video/earth-dive.mp4")} muted className="absolute inset-0 size-full object-cover" />
      <AbsoluteFill style={{ opacity: shown }}>
        <div className="absolute right-[150px] top-[300px] w-[760px] text-right">
          <div className="display-poster text-poster text-on-night" style={{ translate: `0 ${(1 - progress(frame, third, 14)) * 40}px` }}>
            1 in 3
          </div>
          <Words text="rural Kenyans live without electricity" at={third + 6} className="mt-4 text-lead text-on-night" />
          <div className="mt-5 text-fine text-on-night-muted" style={{ opacity: progress(frame, third + 16, 10) }}>
            World Bank WDI, 2024: 67.1% of rural people have access
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
