import { cue, type Cue } from "../../components/Soundtrack";
import { ARRIVAL_FRAMES, HUB_UI_FROM, NOOR_REPLY_FROM } from "./scenes/HubScene";
import { SCAN_TIMING } from "./scenes/ScanScene";
import { TEXT_TIMING } from "./scenes/TextScene";
import { OFFICER_FROM } from "./scenes/UnsureScene";
import { END_CARD_FROM, sceneFrom, wordAt } from "./timeline";

const at = (scene: Parameters<typeof sceneFrom>[0], local: number) => sceneFrom(scene) + local;

function keyClicks(): Cue[] {
  const clicks: Cue[] = [];
  for (let local = TEXT_TIMING.typeFrom; local < TEXT_TIMING.typeUntil; local += 3) clicks.push(cue(at("text", local), "key", 0.32));
  return clicks;
}

function shutterClicks(): Cue[] {
  return Array.from({ length: 6 }, (_, index) => {
    const local = SCAN_TIMING.captureFrom + SCAN_TIMING.firstShotAt + index * SCAN_TIMING.every;
    return cue(at("scan", local), "shutter", 0.55);
  });
}

export const DEMO_CUES: Cue[] = [
  cue(0, "whoosh", 0.4),
  cue(22, "scan", 0.45),
  cue(wordAt("hook", "rust") + 4, "hit", 0.7),
  cue(wordAt("hook", "tree") - 2, "whoosh", 0.35),
  cue(sceneFrom("problem"), "whoosh", 0.3),
  ...keyClicks(),
  cue(at("text", TEXT_TIMING.sentAt), "sms", 0.45),
  cue(at("text", TEXT_TIMING.launchAt), "whoosh", 0.5),
  cue(at("hub", ARRIVAL_FRAMES), "sms", 0.7),
  cue(at("hub", HUB_UI_FROM), "whoosh", 0.3),
  cue(at("hub", wordAt("hub", "or")), "hit", 0.35),
  cue(at("hub", NOOR_REPLY_FROM), "sms", 0.7),
  ...shutterClicks(),
  cue(at("scan", SCAN_TIMING.captureFrom + SCAN_TIMING.firstShotAt), "scan", 0.35),
  cue(at("scan", SCAN_TIMING.cardFrom), "whoosh", 0.35),
  cue(at("unsure", wordAt("unsure", "tap")), "key", 0.6),
  cue(at("unsure", OFFICER_FROM), "whoosh", 0.4),
  cue(at("unsure", OFFICER_FROM + 18), "sms", 0.6),
  cue(at("guardrail", wordAt("guardrail", "team") - 8), "hit", 0.35),
  cue(sceneFrom("scale"), "whoosh", 0.35),
  cue(END_CARD_FROM, "hit", 0.45),
];
