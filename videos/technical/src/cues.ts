import { cue, type Cue } from "./components/Soundtrack";
import { at, beat } from "./lib/timeline";

const keyTaps = (from: number, count: number, every: number): Cue[] => Array.from({ length: count }, (_, index) => cue(from + index * every, "key", 0.18));

/** One-shot effects on the frames the picture hits. */
export const CUES: Cue[] = [
  cue(at("problem", "thirty-eight"), "whoosh", 0.25),
  cue(at("problem", "sixty-six"), "whoosh", 0.25),
  ...keyTaps(beat("hub").from + 4, 12, 3),
  cue(at("hub", "hub") - 8, "sms", 0.4),
  cue(at("hub", "confirm") - 30, "sms", 0.4),
  cue(at("tiny", "Texts"), "sms", 0.35),
  cue(at("tiny", "gigabytes") - 14 + 10, "hit", 0.35),
  cue(at("tiny", "leaf") + 8, "key", 0.4),
  cue(at("tiny", "sixty-eight") + 6, "hit", 0.3),
  cue(beat("scan").from, "shutter", 0.35),
  cue(at("scan", "Twenty") - 2, "whoosh", 0.3),
  cue(at("scan", "names") - 6, "hit", 0.45),
  cue(at("race", "thirty-three"), "hit", 0.5),
  cue(at("officer", "tap"), "key", 0.4),
  cue(at("officer", "tap") + 18, "sms", 0.35),
  cue(at("officer", "approve") + 4, "key", 0.4),
  cue(at("close", "re-leaf"), "whoosh", 0.35),
  cue(at("close", "need") + 22, "hit", 0.55),
];
