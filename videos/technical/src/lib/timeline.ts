import timings from "../voiceTimings.json";
import { beatLength, buildBeats, FPS, totalFrames, type BeatId } from "./beats";

export { FPS, type BeatId, type Word } from "./beats";
export const FRAME = { width: 1920, height: 1080 };

export const BEATS = buildBeats(timings);
export const DURATION = totalFrames(BEATS);

export function beat(id: BeatId) {
  const found = BEATS.find((item) => item.id === id);
  if (!found) throw new Error(`No beat ${id}`);
  return found;
}

export const sceneLength = (id: BeatId) => beatLength(BEATS, id);

/** The frame, relative to the beat start, at which the spoken word containing `text` begins. */
export function wordAt(id: BeatId, text: string, occurrence = 0): number {
  const matches = beat(id).words.filter((word) => word.text.toLowerCase().includes(text.toLowerCase()));
  const word = matches[occurrence];
  if (!word) throw new Error(`Word "${text}" not found in beat ${id}`);
  return Math.round(word.start * FPS);
}

/** A word's start in absolute composition frames. */
export const at = (id: BeatId, text: string, occurrence = 0) => beat(id).from + wordAt(id, text, occurrence);
