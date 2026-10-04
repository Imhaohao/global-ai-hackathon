// Pure beat arithmetic, shared by the composition (timeline.ts) and the node check scripts.
export const FPS = 30;

export type Word = { text: string; start: number; end: number };
export type BeatId = "problem" | "hub" | "tiny" | "scan" | "race" | "officer" | "close";
export type Timing = { beat: string; speechEnd: number; words: Word[] };
export type Beat = { id: BeatId; from: number; speechFrames: number; words: Word[] };

const VOICE_START = 12;
const GAP = 6;
export const END_HOLD = 45;
/** Extra silent frames after a line, where a picture needs a moment longer than the words. */
const EXTRA: Partial<Record<BeatId, number>> = { problem: 8, hub: 8, tiny: 14, scan: 14, race: 22, officer: 8 };

export function buildBeats(timings: Timing[]): Beat[] {
  let cursor = VOICE_START;
  return timings.map((timing) => {
    const beat = { id: timing.beat as BeatId, from: cursor, speechFrames: Math.round(timing.speechEnd * FPS), words: timing.words };
    cursor += beat.speechFrames + GAP + (EXTRA[beat.id] ?? 0);
    return beat;
  });
}

export function totalFrames(beats: Beat[]): number {
  const last = beats[beats.length - 1];
  return last.from + last.speechFrames + END_HOLD;
}

/** Frames from the start of a beat to the start of the next one. */
export function beatLength(beats: Beat[], id: BeatId): number {
  const index = beats.findIndex((item) => item.id === id);
  const next = beats[index + 1];
  return next ? next.from - beats[index].from : totalFrames(beats) - beats[index].from;
}

/** The frame, relative to a beat's start, at which the spoken word containing `text` begins. */
export function wordFrame(beat: Beat, text: string): number {
  const word = beat.words.find((item) => item.text.toLowerCase().includes(text.toLowerCase()));
  if (!word) throw new Error(`Word "${text}" not found in beat ${beat.id}`);
  return Math.round(word.start * FPS);
}
