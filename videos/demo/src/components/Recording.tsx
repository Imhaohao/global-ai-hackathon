import { Freeze, OffthreadVideo, Sequence, staticFile } from "remotion";
import { FPS } from "../timeline";

/** One continuous stretch of a screen recording, from `sourceFrom` to `sourceTo` seconds, played at `rate`. */
export type RecordingCut = { sourceFrom: number; sourceTo: number; rate?: number };

export function cutLength(cut: RecordingCut) {
  return Math.round(((cut.sourceTo - cut.sourceFrom) * FPS) / (cut.rate ?? 1));
}

/**
 * Plays a real screen recording as a chain of cuts, each starting where the last one ended. After the last cut, its
 * final frame is held until the scene leaves.
 */
export function Recording({ src, cuts }: { src: string; cuts: RecordingCut[] }) {
  let start = 0;
  const pieces = cuts.map((cut, index) => {
    const from = start;
    const length = cutLength(cut);
    start += length;
    return (
      <Sequence key={`${cut.sourceFrom}-${index}`} from={from} durationInFrames={length} layout="none">
        <Clip src={src} cut={cut} />
      </Sequence>
    );
  });
  const last = cuts[cuts.length - 1];
  return (
    <>
      {pieces}
      <Sequence from={start} layout="none">
        <Freeze frame={cutLength(last) - 1}>
          <Clip src={src} cut={last} />
        </Freeze>
      </Sequence>
    </>
  );
}

function Clip({ src, cut }: { src: string; cut: RecordingCut }) {
  return (
    <OffthreadVideo
      src={staticFile(src)}
      muted
      trimBefore={Math.round(cut.sourceFrom * FPS)}
      trimAfter={Math.round(cut.sourceTo * FPS)}
      playbackRate={cut.rate ?? 1}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/** Local frame where cut `index` begins. */
export function cutStart(cuts: RecordingCut[], index: number) {
  return cuts.slice(0, index).reduce((sum, cut) => sum + cutLength(cut), 0);
}
