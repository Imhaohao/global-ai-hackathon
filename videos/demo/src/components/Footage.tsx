import { AbsoluteFill, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type FootageProps = {
  src: string;
  /** Scale at the first and last frame of the shot, for a slow push. */
  zoom?: [number, number];
  /** How dark the grade sits, 0 to 1, so type on top stays readable. */
  shade?: number;
  rate?: number;
  trimBefore?: number;
};

/** Licensed live-action footage, full bleed, with a slow push, a cool filmic grade and a vignette. */
export function Footage({ src, zoom = [1.04, 1.12], shade = 0.25, rate = 1, trimBefore = 0 }: FootageProps) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const scale = interpolate(frame, [0, durationInFrames], zoom, { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill className="overflow-hidden bg-night">
      <OffthreadVideo
        src={staticFile(src)}
        muted
        playbackRate={rate}
        trimBefore={trimBefore}
        className="absolute inset-0 size-full object-cover"
        style={{ scale, filter: "saturate(0.9) contrast(1.06) brightness(0.96)" }}
      />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(13,15,11,${shade * 0.4}) 35%, rgba(13,15,11,${0.35 + shade}) 100%)` }} />
    </AbsoluteFill>
  );
}
