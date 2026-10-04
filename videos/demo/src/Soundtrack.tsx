import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { SFX_CUES, type SfxCue } from "./sfx";
import { SCRIPT } from "./voiceover";
import { DURATION, VOICE_START, voiceEnd, voiceFile } from "./timeline";

const MUSIC_FULL = 0.5;
const MUSIC_UNDER_VOICE = 0.2;
const CROSSFADE = 12;

/**
 * The generated bed lifts at 18.5 s and fades from 47 s, so it is laid in three pieces cut on its own bar dips: the
 * lift lands as the basic phone appears, a groove section repeats under the story, and its real ending closes the video.
 */
const MUSIC_PIECES = [
  { from: 0, to: 1150, sourceFrom: 8.6 },
  { from: 1150, to: DURATION - 260, sourceFrom: 24.0 },
  { from: DURATION - 260, to: DURATION, sourceFrom: 44.6 },
] as const;

function musicVolume(frame: number) {
  const speaking = SCRIPT.some(({ beat }) => frame >= VOICE_START[beat] - 6 && frame <= voiceEnd(beat) + 4);
  const fadeOut = interpolate(frame, [DURATION - 40, DURATION], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (speaking ? MUSIC_UNDER_VOICE : MUSIC_FULL) * fadeOut;
}

function pieceFade(frame: number, length: number, fadesIn: boolean) {
  const fadeIn = fadesIn ? interpolate(frame, [0, CROSSFADE], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const fadeOut = interpolate(frame, [length, length + CROSSFADE], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return fadeIn * fadeOut;
}

function Effect({ cue }: { cue: SfxCue }) {
  return (
    <Sequence from={cue.at} durationInFrames={cue.frames ?? 45} layout="none">
      <Audio src={staticFile(`audio/sfx/${cue.file}.wav`)} volume={cue.volume ?? 0.5} />
    </Sequence>
  );
}

/** Narration, the ducked music bed, and the few interface sounds, all placed on the shared timeline. */
export function Soundtrack() {
  return (
    <>
      {SCRIPT.map(({ beat }) => (
        <Sequence key={beat} from={VOICE_START[beat]} layout="none">
          <Audio src={staticFile(voiceFile(beat))} />
        </Sequence>
      ))}
      {MUSIC_PIECES.map((piece) => (
        <Sequence key={piece.from} from={piece.from} durationInFrames={piece.to - piece.from + CROSSFADE} layout="none">
          <Audio src={staticFile("audio/music.mp3")} trimBefore={Math.round(piece.sourceFrom * 30)} volume={(frame) => musicVolume(frame + piece.from) * pieceFade(frame, piece.to - piece.from, piece.from > 0)} />
        </Sequence>
      ))}
      {SFX_CUES.map((cue, index) => (
        <Effect key={index} cue={cue} />
      ))}
    </>
  );
}
