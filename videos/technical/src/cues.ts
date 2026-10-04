import { cue, type Cue } from "./components/Soundtrack";
import { at, beat } from "./lib/timeline";

const keyTaps = (from: number, count: number, every: number): Cue[] => Array.from({ length: count }, (_, index) => cue(from + index * every, "key", 0.18));

/** One-shot effects on the frames the picture hits. */
export const CUES: Cue[] = [
  cue(at("problem", "thirty-eight"), "whoosh", 0.25),
  cue(at("problem", "Sixty-six"), "whoosh", 0.25),
  ...keyTaps(beat("hub").from + 4, 12, 3),
  cue(at("hub", "hub") - 8, "sms", 0.4),
  cue(at("hub", "confirm") - 30, "sms", 0.4),
  cue(beat("scan").from, "shutter", 0.35),
  cue(at("scan", "split") - 2, "scan", 0.3),
  cue(beat("biology").from, "whoosh", 0.25),
  cue(at("race", "thirty-three"), "hit", 0.5),
  cue(at("officer", "tap"), "key", 0.4),
  cue(at("officer", "tap") + 18, "sms", 0.35),
  cue(at("officer", "approve") + 4, "key", 0.4),
  cue(at("close", "Leaf") + 4, "hit", 0.55),
];
