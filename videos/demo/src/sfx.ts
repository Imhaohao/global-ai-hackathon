import { APPROVE_TAP } from "./story/OfficerApproval";
import { SEND_TAP } from "./story/Cameo";
import { NAME_AT } from "./scenes/Close";
import { ARRIVALS, KEY_PRESSES, SEED_SENT_AT, SENT_AT } from "./story";
import { SCENES, VOICE_START, cue } from "./timeline";
import { ROUTE } from "./story/framing";

const PILE_LANDINGS = [VOICE_START.advisers - 4, cue("advisers", "each"), cue("advisers", "farm"), cue("advisers", "adviser"), cue("advisers", "hundreds") - 4];

export type SfxCue = { at: number; file: "hit" | "key" | "scan" | "shutter" | "sms" | "whoosh"; volume?: number; frames?: number };

/** Key clicks, message chirps, taps and the two scene sweeps, all on the voice-cued timeline. */
export const SFX_CUES: SfxCue[] = [
  { at: SCENES.story.from - 6, file: "whoosh", volume: 0.3 },
  ...PILE_LANDINGS.map((at) => ({ at, file: "whoosh" as const, volume: 0.2 })),
  { at: ROUTE.from + 20, file: "sms", volume: 0.22 },
  { at: SCENES.close.from - 6, file: "whoosh", volume: 0.3 },
  { at: VOICE_START.weekend - 6, file: "whoosh", volume: 0.22 },
  ...KEY_PRESSES.map((press) => ({ at: press.at, file: "key" as const, volume: 0.16, frames: 4 })),
  ...ARRIVALS.map((at) => ({ at, file: "sms" as const, volume: 0.32 })),
  { at: SENT_AT, file: "sms", volume: 0.2 },
  { at: SEED_SENT_AT, file: "sms", volume: 0.2 },
  { at: SEND_TAP, file: "key", volume: 0.4, frames: 6 },
  { at: APPROVE_TAP, file: "key", volume: 0.4, frames: 6 },
  { at: NAME_AT + 14, file: "hit", volume: 0.55, frames: 90 },
];
