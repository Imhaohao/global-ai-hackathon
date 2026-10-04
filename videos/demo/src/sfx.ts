import { AIRPLANE, SEND_TAP } from "./app/shots";
import { NAME_AT } from "./scenes/Close";
import { ARRIVALS, KEY_PRESSES, SEED_SENT_AT, SENT_AT } from "./story";
import { SCENES, VOICE_START, cue } from "./timeline";

const PILE_LANDINGS = [VOICE_START.reach, cue("reach", "tools"), cue("reach", "harvest"), cue("reach", "exist"), cue("barriers", "adviser") - 4];

export type SfxCue = { at: number; file: "hit" | "key" | "scan" | "shutter" | "sms" | "whoosh"; volume?: number; frames?: number };

/** Key clicks, message chirps, taps and the two scene sweeps, all on the voice-cued timeline. */
/** Key clicks, message chirps, taps and the scene sweeps, all on the voice-cued timeline. */
export const SFX_CUES: SfxCue[] = [
  ...PILE_LANDINGS.map((at) => ({ at, file: "whoosh" as const, volume: 0.2 })),
  ...(["scan", "seed", "sms", "officer", "close"] as const).map((scene) => ({ at: SCENES[scene].from - 6, file: "whoosh" as const, volume: 0.26 })),
  ...KEY_PRESSES.map((press) => ({ at: press.at, file: "key" as const, volume: 0.16, frames: 4 })),
  ...ARRIVALS.map((at) => ({ at, file: "sms" as const, volume: 0.32 })),
  { at: SENT_AT, file: "sms", volume: 0.2 },
  { at: SEED_SENT_AT, file: "sms", volume: 0.2 },
  { at: SEND_TAP, file: "key", volume: 0.4, frames: 6 },
  { at: AIRPLANE.swipe, file: "whoosh", volume: 0.35 },
  { at: AIRPLANE.press, file: "key", volume: 0.6, frames: 6 },
  { at: AIRPLANE.press, file: "hit", volume: 0.7, frames: 90 },
  { at: AIRPLANE.wifiOff, file: "key", volume: 0.35, frames: 6 },
  { at: AIRPLANE.cellOff, file: "key", volume: 0.35, frames: 6 },
  { at: NAME_AT + 14, file: "hit", volume: 0.55, frames: 90 },
];
