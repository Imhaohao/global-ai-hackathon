import { cue, type Cue } from "../../components/Soundtrack";
import { FLIP_TIMING } from "./scenes/FlipScene";
import { REVEAL } from "./scenes/GapScene";
import { LOCAL_TIMING } from "./scenes/LocalScene";
import { PHOTO_TIMING } from "./scenes/PhotoScene";
import { TEXT_TIMING } from "./scenes/TextScene";
import { END_CARD_FROM, sceneFrom, wordAt } from "./timeline";
import type { BeatId } from "./voiceover";

const at = (scene: BeatId, local: number) => sceneFrom(scene) + local;

function keyClicks(): Cue[] {
  const clicks: Cue[] = [];
  for (let local = TEXT_TIMING.typeFrom; local < TEXT_TIMING.typeUntil; local += 3) clicks.push(cue(at("flip", local), "key", 0.3));
  return clicks;
}

export const DEMO_CUES: Cue[] = [
  cue(0, "whoosh", 0.4),
  cue(REVEAL.from, "scan", 0.45),
  cue(wordAt("gap", "disease") + 2, "hit", 0.6),
  cue(wordAt("gap", "but") - 6, "whoosh", 0.35),
  cue(sceneFrom("barriers"), "whoosh", 0.3),
  cue(at("barriers", wordAt("barriers", "and") - 6), "hit", 0.35),
  cue(sceneFrom("small"), "whoosh", 0.3),
  cue(at("small", wordAt("small", "at") - 6), "scan", 0.4),
  cue(at("small", wordAt("small", "while") - 4), "hit", 0.35),
  ...keyClicks(),
  cue(at("flip", TEXT_TIMING.sentAt), "sms", 0.45),
  cue(at("flip", TEXT_TIMING.launchAt), "whoosh", 0.45),
  cue(at("flip", FLIP_TIMING.arrivalFrom + FLIP_TIMING.arrivalFrames), "sms", 0.7),
  cue(at("flip", FLIP_TIMING.hubFrom), "whoosh", 0.3),
  cue(at("photo", PHOTO_TIMING.attachAt), "shutter", 0.55),
  cue(at("photo", PHOTO_TIMING.sentAt), "whoosh", 0.45),
  cue(sceneFrom("local"), "sms", 0.6),
  cue(at("local", LOCAL_TIMING.cardFrom), "whoosh", 0.3),
  cue(at("local", LOCAL_TIMING.unsureFrom), "whoosh", 0.3),
  cue(at("local", LOCAL_TIMING.officerFrom + 16), "sms", 0.6),
  cue(END_CARD_FROM, "hit", 0.45),
];
