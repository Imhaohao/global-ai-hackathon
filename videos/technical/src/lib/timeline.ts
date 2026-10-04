import timings from "../voiceTimings.json";

export const FPS = 30;
export const FRAME = { width: 1920, height: 1080 };

export type Word = { text: string; start: number; end: number };
export type BeatId = "hook" | "data" | "biology" | "bench" | "sms" | "seed" | "hotspots" | "close";

const VOICE_START = 12;
const GAP = 10;
const END_HOLD = 72;
/** Extra silent frames after a line, where a dense picture needs a moment longer than the words. */
const EXTRA: Partial<Record<BeatId, number>> = { data: 24, biology: 14, bench: 8, sms: 6, seed: 12 };

export type Beat = { id: BeatId; from: number; speechFrames: number; words: Word[] };

function buildBeats(): Beat[] {
  let cursor = VOICE_START;
  return timings.map((timing) => {
    const beat = { id: timing.beat as BeatId, from: cursor, speechFrames: Math.round(timing.speechEnd * FPS), words: timing.words };
    cursor += beat.speechFrames + GAP + (EXTRA[beat.id] ?? 0);
    return beat;
  });
}

export const BEATS = buildBeats();
const last = BEATS[BEATS.length - 1];
export const DURATION = last.from + last.speechFrames + END_HOLD;

export function beat(id: BeatId): Beat {
  const found = BEATS.find((item) => item.id === id);
  if (!found) throw new Error(`No beat ${id}`);
  return found;
}

/** Frames from the start of a beat to the start of the next one, so each scene runs until the next takes over. */
export function sceneLength(id: BeatId): number {
  const index = BEATS.findIndex((item) => item.id === id);
  const next = BEATS[index + 1];
  return next ? next.from - BEATS[index].from : DURATION - BEATS[index].from;
}

/** The frame, relative to the beat start, at which the spoken word containing `text` begins. */
export function wordAt(id: BeatId, text: string, occurrence = 0): number {
  const matches = beat(id).words.filter((word) => word.text.toLowerCase().includes(text.toLowerCase()));
  const word = matches[occurrence];
  if (!word) throw new Error(`Word "${text}" not found in beat ${id}`);
  return Math.round(word.start * FPS);
}
