// Where Noor's phone sits, how it turns and where the camera looks, frame by frame. Pure functions, shared by the
// renderer (HeroPhone) and the OCR mask script, which needs the keypad's on-screen box on every frame.
import { BODY, LEGEND_REGION, fromCentre } from "../components/flipPhoneGeometry.ts";
import { track } from "../lib/keys.ts";
import { SCENES, cue } from "../timeline.ts";

/** The phone is drawn at twice its resting size, so a push-in to 3x still renders sharp text. */
export const BASE_SCALE = 0.5;

const CENTRE = { x: 0, y: 0 };
const SIGNAL = fromCentre({ x: 250, y: 255 });
const KEYPAD = fromCentre({ x: 420, y: 1390 });
const SCREEN = fromCentre({ x: 420, y: 486 });
const SEED_VIEW = fromCentre({ x: 420, y: 800 });

type Shot = [frame: number, zoom: number, point: { x: number; y: number }];

const S = SCENES.sms;
const TYPING_FROM = cue("sms", "Just") - 10;
const OFF = 1800;

/** Where the camera looks on the basic phone: the part the voice is explaining fills the frame. */
const SHOTS: Shot[] = [
  [S.from, 0.9, CENTRE],
  [S.from + 30, 1, CENTRE],
  [cue("sms", "No") + 26, 1, CENTRE],
  [cue("sms", "internet") + 2, 4.6, SIGNAL],
  [cue("sms", "data") + 6, 4.6, SIGNAL],
  [TYPING_FROM - 2, 1.9, KEYPAD],
  [cue("sms", "reply") - 22, 1.9, KEYPAD],
  [cue("sms", "reply") - 8, 3.2, SCREEN],
  [cue("followup", "and") - 4, 3.2, SCREEN],
  [cue("followup", "send") - 2, 1.35, SEED_VIEW],
  [cue("followup", "ninety-three") + 2, 1.35, SEED_VIEW],
  [S.to, 2.6, SCREEN],
];

/** Where the whole phone sits on the frame, in pixels from centre. */
const PLACE_X: [number, number][] = [
  [S.from - 1, OFF],
  [S.from, 0],
  [cue("sms", "reply") - 8, 0],
  [cue("sms", "reply") + 4, -120],
  [cue("followup", "and") - 4, -120],
  [cue("followup", "send") - 2, 0],
];

const ROTATE_Y: [number, number][] = [
  [S.from, -170],
  [S.from + 30, -8],
  [cue("sms", "No") + 26, 0],
  [cue("followup", "and") - 4, 0],
  [cue("followup", "send") - 2, -10],
  [cue("followup", "send") + 8, 0],
];

export type Framing = { zoom: number; x: number; y: number; placeX: number; rotateY: number; rotateX: number };

export function framingAt(frame: number): Framing {
  return {
    zoom: track(frame, SHOTS.map(([at, z]) => [at, z])),
    x: track(frame, SHOTS.map(([at, z, p]) => [at, -z * p.x * BASE_SCALE])),
    y: track(frame, SHOTS.map(([at, z, p]) => [at, -z * p.y * BASE_SCALE])),
    placeX: track(frame, PLACE_X),
    rotateY: track(frame, ROTATE_Y),
    rotateX: track(frame, [[S.from, 10], [S.from + 30, 0]]),
  };
}

function legendBox(centreX: number, centreY: number, scale: number) {
  const margin = 50;
  const left = fromCentre({ x: LEGEND_REGION.x - margin, y: LEGEND_REGION.y - margin });
  return { x: 960 + centreX + left.x * scale, y: 540 + centreY + left.y * scale, width: (LEGEND_REGION.width + 2 * margin) * scale, height: (LEGEND_REGION.height + 2 * margin) * scale };
}

/** The keypad legends' box on the 1920x1080 frame, or null when no basic phone is on screen. */
export function legendBoxAt(frame: number): { x: number; y: number; width: number; height: number } | null {
  if (frame < SCENES.sms.from || frame > SCENES.sms.to) return null;
  const view = framingAt(frame);
  if (Math.abs(view.placeX) >= OFF - 1) return null;
  return legendBox(view.placeX + view.x, view.y, view.zoom * BASE_SCALE);
}

export const PHONE_SIZE = { width: BODY.width * BASE_SCALE, height: BODY.height * BASE_SCALE };
