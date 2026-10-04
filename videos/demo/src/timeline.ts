import timings from "./voiceTimings.json" with { type: "json" };
import type { BeatId } from "./voiceover";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

type Timing = { beat: BeatId; seconds: number; speechEnd: number; words: { text: string; start: number; end: number }[] };
const TIMINGS = timings as Timing[];

/** Frames of silence before each line. The first line waits for the orbit shot to settle. */
const GAP_BEFORE: Record<BeatId, number> = { access: 12, phones: 9, scan: 11, sms: 10, shop: 10, seed: 12, map: 12, close: 13 };

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
  orbit: { from: 0, to: VOICE_START.phones - 4 },
  chaos: { from: VOICE_START.phones - 4, to: VOICE_START.scan },
  scan: { from: VOICE_START.scan, to: VOICE_START.sms - 4 },
  sms: { from: VOICE_START.sms - 4, to: VOICE_START.shop - 4 },
  shop: { from: VOICE_START.shop - 4, to: VOICE_START.seed - 4 },
  seed: { from: VOICE_START.seed - 4, to: VOICE_START.map - 4 },
  map: { from: VOICE_START.map - 4, to: VOICE_START.close - 6 },
  close: { from: VOICE_START.close - 6, to: voiceEnd("close") + 10 },
  endCard: { from: voiceEnd("close") + 10, to: voiceEnd("close") + 10 + 120 },
} as const;

export type SceneId = keyof typeof SCENES;
export const DURATION = SCENES.endCard.to;
