import timings from "./voiceTimings.json" with { type: "json" };
import type { BeatId } from "./voiceover";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

type Timing = { beat: BeatId; seconds: number; speechEnd: number; words: { text: string; start: number; end: number }[] };
const TIMINGS = timings as Timing[];

/** Frames of silence before each line, so each picture can finish moving before the next idea starts. */
const GAP_BEFORE: Record<BeatId, number> = { problem: 18, advisers: 8, texts: 26, reply: 14, tiny: 20, shop: 18, seed: 22, weekend: 18, officer: 16, alert: 18, close: 22 };
/** Frames after the last word while the grid folds into the mark and the name lands. */
const TAIL = 92;

const seconds = (value: number) => Math.round(value * FPS);

function lineStarts(): Record<BeatId, number> {
  const starts = {} as Record<BeatId, number>;
  let cursor = 0;
  for (const timing of TIMINGS) {
    starts[timing.beat] = cursor + GAP_BEFORE[timing.beat];
    cursor = starts[timing.beat] + seconds(timing.speechEnd);
  }
  return starts;
}

export const VOICE_START = lineStarts();

function timingOf(beat: BeatId): Timing {
  const timing = TIMINGS.find((entry) => entry.beat === beat);
  if (!timing) throw new Error(`No voice timing for ${beat}`);
  return timing;
}

/** Absolute frame where the narrator starts saying `word` (first match, punctuation ignored) in a line. */
export function cue(beat: BeatId, word: string): number {
  const clean = (text: string) => text.toLowerCase().replace(/[^a-z0-9']/g, "");
  const found = timingOf(beat).words.find((entry) => clean(entry.text) === clean(word));
  if (!found) throw new Error(`"${word}" is not spoken in ${beat}`);
  return VOICE_START[beat] + seconds(found.start);
}

export const voiceEnd = (beat: BeatId) => VOICE_START[beat] + seconds(timingOf(beat).speechEnd);
export const voiceFile = (beat: BeatId) => `audio/voice/${beat}.mp3`;

export const SCENES = {
  problem: { from: 0, to: VOICE_START.texts - 8 },
  story: { from: VOICE_START.texts - 8, to: VOICE_START.close - 10 },
  close: { from: VOICE_START.close - 10, to: voiceEnd("close") + TAIL },
} as const;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.close.to;
