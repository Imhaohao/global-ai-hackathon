import { cue, type Cue } from "./components/Soundtrack";
import { beat, wordAt } from "./lib/timeline";

const at = (id: Parameters<typeof beat>[0], word?: string) => beat(id).from + (word ? wordAt(id, word) : 0);

/** One-shot effects on the frames the picture hits. */
export const CUES: Cue[] = [
  cue(at("hook", "Leaf") - 8, "whoosh", 0.5),
  cue(at("hook", "Leaf") + 2, "hit", 0.6),
  cue(at("data"), "whoosh", 0.35),
  cue(at("data", "split") - 6, "scan", 0.3),
  cue(at("biology"), "whoosh", 0.3),
  cue(at("bench"), "whoosh", 0.3),
  cue(at("sms"), "whoosh", 0.3),
  cue(at("sms", "Offline") + 2, "key", 0.35),
  cue(at("sms", "confirm") - 30, "sms", 0.45),
  cue(at("seed"), "scan", 0.4),
  cue(at("hotspots"), "whoosh", 0.3),
  cue(at("close", "Leaf") - 4, "hit", 0.6),
];
