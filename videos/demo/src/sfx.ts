import { SHUTTER_AT } from "./scenes/Scan";
import { SEED_SCAN_AT } from "./scenes/Seed";
import { SHOP_BUBBLES } from "./scenes/Shop";
import { SMS_REPLIES, SMS_TYPING } from "./scenes/Sms";
import { MAP_TAP } from "./scenes/Map";
import { END_WORDMARK_AT } from "./scenes/EndCard";
import { SCENES } from "./timeline";

export type SfxCue = { at: number; file: "hit" | "key" | "scan" | "shutter" | "sms" | "whoosh"; volume?: number; frames?: number };

const whooshes: SfxCue[] = (["chaos", "scan", "sms", "seed", "map", "close"] as const).map((scene) => ({ at: SCENES[scene].from - 6, file: "whoosh", volume: 0.28 }));

function keyClicks(from: number, to: number): SfxCue[] {
  return Array.from({ length: Math.floor((to - from) / 3) }, (_, index) => ({ at: from + index * 3, file: "key" as const, volume: 0.18, frames: 4 }));
}

const smsStart = SCENES.sms.from;
const shopStart = SCENES.shop.from;

export const SFX_CUES: SfxCue[] = [
  ...whooshes,
  { at: SCENES.scan.from + 6, file: "hit", volume: 0.5, frames: 60 },
  ...SMS_TYPING.flatMap(([from, to]) => keyClicks(smsStart + from, smsStart + to - 2)),
  ...SMS_REPLIES.map((at) => ({ at: smsStart + at, file: "sms" as const, volume: 0.45 })),
  ...SHOP_BUBBLES.filter((bubble) => bubble.from === "bot").map((bubble) => ({ at: shopStart + bubble.at, file: "sms" as const, volume: 0.45 })),
  { at: SCENES.seed.from + SEED_SCAN_AT, file: "scan", volume: 0.35 },
  { at: SCENES.map.from + MAP_TAP, file: "key", volume: 0.4, frames: 6 },
  { at: SCENES.endCard.from + END_WORDMARK_AT + 16, file: "hit", volume: 0.6, frames: 90 },
];

export const SCAN_SHUTTER: SfxCue = { at: SCENES.scan.from + SHUTTER_AT, file: "shutter", volume: 0.5 };
