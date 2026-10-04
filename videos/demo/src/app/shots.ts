// Every iPhone shot of the real app: which recording or capture plays, how it is cut, and where the camera looks.
// Pure data and maths, so scripts/writeMasks.ts can find the iPhone screen on any frame for the OCR word check.
import type { CameraKey } from "../components/Camera";
import type { RecordingCut } from "../components/Recording";
import { focus } from "../lib/focus.ts";
import { track } from "../lib/keys.ts";
import { SCREEN } from "../lib/screen.ts";
import { PHONE_SCREEN_HEIGHT } from "../lib/focus.ts";
import { SCENES, cue } from "../timeline.ts";

export type AppShot = {
  id: string;
  from: number;
  to: number;
  /** A recording cut into pieces, or a still capture. */
  media: { kind: "recording"; src: string; cuts: RecordingCut[] } | { kind: "still"; src: string };
  phoneX: number;
  keys: CameraKey[];
};

const LEFT = { x: -250, y: 0 };
const look = (at: number, point: { x: number; y: number }, zoom: number) => focus(at, point, zoom, LEFT, LEFT);

const scan = SCENES.scan.from;
const seed = SCENES.seed.from;
const officer = SCENES.officer.from;

/** ScreenRecording 22-23-18, sped up where it is slow: home, three leaves, the rust card, steps 1 to 5, other causes. */
export const SCAN_CUTS: RecordingCut[] = [
  { sourceFrom: 1.0, sourceTo: 2.0 },
  { sourceFrom: 3.0, sourceTo: 15.0, rate: 5 },
  { sourceFrom: 15.0, sourceTo: 16.2 },
  { sourceFrom: 16.4, sourceTo: 28.4, rate: 6 },
  { sourceFrom: 33.0, sourceTo: 36.0, rate: 2 },
];

/** ScreenRecording 22-33-02, made in airplane mode: genuine, recalled, text 1393, then Control Center. */
export const SEED_CUTS: RecordingCut[] = [
  { sourceFrom: 1.0, sourceTo: 2.0 },
  { sourceFrom: 5.0, sourceTo: 7.6, rate: 1.3 },
  { sourceFrom: 13.0, sourceTo: 14.6, rate: 1.3 },
  { sourceFrom: 20.0, sourceTo: 20.9 },
  { sourceFrom: 22.6, sourceTo: 24.15 },
];
const seedCut = (index: number) => seed + SEED_CUTS.slice(0, index).reduce((sum, cut) => sum + Math.round(((cut.sourceTo - cut.sourceFrom) * 30) / (cut.rate ?? 1)), 0);
export const SEED_RESULTS = { from: seedCut(1) + 20, to: seedCut(3) };
const AIRPLANE_ICON = { x: 325, y: 33 };
const AIRPLANE_TOGGLE = { x: 79, y: 211 };

export const SEND_TAP = cue("officer", "tap") + 2;

/** Filmed in the iOS Simulator from the app build: the not-sure card appears, scrolls to Get help, and the tap lands. */
export const OFFICER_CUTS: RecordingCut[] = [
  { sourceFrom: 2.2, sourceTo: 3.2 },
  { sourceFrom: 4.9, sourceTo: 6.4, rate: 3.6 },
  { sourceFrom: 13.4, sourceTo: 13.85 },
];

/** Frames of the airplane-mode moment, all cued to "the app works in airplane mode". */
export const AIRPLANE = {
  in: cue("promise", "the") - 14,
  swipe: cue("promise", "the") - 2,
  press: cue("promise", "airplane") + 2,
  wifiOff: cue("promise", "airplane") + 10,
  cellOff: cue("promise", "mode") + 4,
  out: SCENES.intro.to,
} as const;

export const APP_SHOTS: AppShot[] = [
  {
    id: "scan",
    from: scan,
    to: SCENES.scan.to,
    media: { kind: "recording", src: "video/rec-scan.mp4", cuts: SCAN_CUTS },
    phoneX: LEFT.x,
    keys: [
      look(scan, { x: 201, y: 437 }, 1),
      look(scan + 30, { x: 201, y: 400 }, 1.25),
      look(scan + 100, { x: 201, y: 400 }, 1.25),
      look(scan + 108, { x: 201, y: 200 }, 1.55),
      look(scan + 138, { x: 201, y: 200 }, 1.55),
      look(scan + 150, { x: 201, y: 340 }, 1.6),
      look(scan + 196, { x: 201, y: 340 }, 1.6),
      look(scan + 206, { x: 201, y: 600 }, 1.5),
    ],
  },
  {
    id: "seed",
    from: seed,
    to: SCENES.seed.to,
    media: { kind: "recording", src: "video/rec-seed.mp4", cuts: SEED_CUTS },
    phoneX: LEFT.x,
    keys: [
      look(seed, { x: 201, y: 437 }, 1),
      look(seedCut(1) + 10, { x: 201, y: 250 }, 1.45),
      look(seedCut(3) - 2, { x: 201, y: 250 }, 1.45),
      look(seedCut(3) + 8, AIRPLANE_ICON, 4.2),
      look(seedCut(4) - 2, AIRPLANE_ICON, 4.2),
      look(seedCut(4) + 14, AIRPLANE_TOGGLE, 2.6),
    ],
  },
  {
    id: "officer",
    from: officer,
    to: SCENES.officer.to,
    media: { kind: "recording", src: "video/rec-officer.mp4", cuts: OFFICER_CUTS },
    phoneX: LEFT.x,
    keys: [look(officer, { x: 201, y: 170 }, 1.7), look(officer + 26, { x: 201, y: 170 }, 1.7), look(officer + 40, { x: 201, y: 430 }, 1.75)],
  },
];

export const AIRPLANE_SEED_FROM = seedCut(3);

/** The iPhone screen's box on the 1920x1080 frame for every app shot on screen at `frame`. */
export function appScreenBoxes(frame: number) {
  if (frame >= AIRPLANE.in && frame < AIRPLANE.out) return [{ x: 0, y: 0, width: 1150, height: 1080 }];
  const pixelsPerPoint = PHONE_SCREEN_HEIGHT / SCREEN.height;
  return APP_SHOTS.filter((shot) => frame >= shot.from && frame < shot.to).map((shot) => {
    const zoom = track(frame, shot.keys.map((key) => [key.at, key.scale]));
    const x = track(frame, shot.keys.map((key) => [key.at, key.x]));
    const y = track(frame, shot.keys.map((key) => [key.at, key.y]));
    const width = SCREEN.width * pixelsPerPoint * zoom;
    const height = PHONE_SCREEN_HEIGHT * zoom;
    return { x: 960 + x + shot.phoneX * zoom - width / 2, y: 540 + y - height / 2, width, height };
  });
}
