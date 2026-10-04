import { FPS, seconds } from "../../lib/timing";
import voiceTimings from "./voiceTimings.json";
import { SCRIPT, type BeatId } from "./voiceover";

export const DEMO_DURATION = seconds(60);

const VOICE_LEAD_IN = 10;

/** Breath after each beat's line, before the next one starts. */
const PAUSE_AFTER: Record<BeatId, number> = {
  gap: 30,
  barriers: 54,
  small: 36,
  flip: 36,
  photo: 30,
  local: 30,
  close: 0,
};

type VoiceTiming = { beat: string; seconds: number; speechEnd: number; words: { text: string; start: number; end: number }[] };

export type Beat = { id: BeatId; from: number; speechEnd: number; until: number; audioFrames: number };

export type TimedWord = { text: string; from: number; to: number; beat: BeatId };

const timingFor = (id: BeatId) => {
  const timing = (voiceTimings as VoiceTiming[]).find((entry) => entry.beat === id);
  if (!timing) throw new Error(`No voice timing for ${id}; run npm run voice`);
  return timing;
};

function buildBeats(): Beat[] {
  let cursor = VOICE_LEAD_IN;
  return SCRIPT.map(({ beat }) => {
    const timing = timingFor(beat);
    const from = cursor;
    const speechEnd = from + Math.round(timing.speechEnd * FPS);
    cursor = speechEnd + PAUSE_AFTER[beat];
    return { id: beat, from, speechEnd, until: cursor, audioFrames: Math.ceil(timing.seconds * FPS) };
  });
}

export const BEATS = buildBeats();

export const beat = (id: BeatId) => BEATS.find((entry) => entry.id === id)!;

export const WORDS: TimedWord[] = BEATS.flatMap((entry) =>
  timingFor(entry.id).words.map((word) => ({
    text: word.text,
    from: entry.from + Math.round(word.start * FPS),
    to: entry.from + Math.round(word.end * FPS),
    beat: entry.id,
  })),
);

/** Where each scene's Sequence starts. The opening scene starts on frame 0, before its voice line. */
export const sceneFrom = (id: BeatId) => (id === "gap" ? 0 : beat(id).from);

/** Where each scene's Sequence ends: the next scene's start, or the end of the reel. */
export function sceneLength(id: BeatId): number {
  const index = BEATS.findIndex((entry) => entry.id === id);
  const next = BEATS[index + 1];
  return (next ? sceneFrom(next.id) : DEMO_DURATION) - sceneFrom(id);
}

/** The frame, relative to its scene's start, at which the voice says a word (first match, case-insensitive). */
export function wordAt(id: BeatId, text: string, occurrence = 0): number {
  const start = sceneFrom(id);
  const matches = WORDS.filter((word) => word.beat === id && word.text.toLowerCase().replace(/[^a-z']/g, "") === text.toLowerCase());
  const match = matches[occurrence];
  if (!match) throw new Error(`"${text}" is not spoken in ${id}`);
  return match.from - start;
}

export const END_CARD_FROM = beat("close").from + 84;
