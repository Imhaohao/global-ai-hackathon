// Where Noor's phone sits, how it turns and where the camera looks, frame by frame. Pure functions, shared by the
// renderer (HeroPhone) and the OCR mask script, which needs the keypad's on-screen box on every frame.
import { BODY, LEGEND_REGION, fromCentre, keyCentre } from "../components/flipPhoneGeometry.ts";
import { track } from "../lib/keys.ts";
import { SCENES, VOICE_START, cue } from "../timeline.ts";

/** The phone is drawn at twice its resting size, so a push-in to 3x still renders sharp text. */
export const BASE_SCALE = 0.5;

const CENTRE = { x: 0, y: 0 };
const SIGNAL = fromCentre({ x: 250, y: 255 });
const KEYPAD = fromCentre({ x: 420, y: 1390 });
const SCREEN = fromCentre({ x: 420, y: 486 });
const SEED_VIEW = fromCentre({ x: 420, y: 800 });
const CALL_KEY = fromCentre(keyCentre("call"));

type Shot = [frame: number, zoom: number, point: { x: number; y: number }];

const V = VOICE_START;
export const CAMEO_OUT = cue("officer", "or") - 10;
export const OFFICER_BACK = CAMEO_OUT + 18;
export const ALERT_BACK = cue("alert", "approves") + 16;
export const ROUTE = { from: V.tiny - 4, until: V.shop - 6 };
const OFF = 1800;

const SHOTS: Shot[] = [
  [V.texts - 8, 0.85, CENTRE],
  [V.texts + 24, 1, CENTRE],
  [cue("texts", "text") - 2, 4.6, SIGNAL],
  [cue("texts", "Noor") - 4, 4.6, SIGNAL],
  [cue("texts", "Noor") + 8, 1.9, KEYPAD],
  [V.reply - 22, 1.9, KEYPAD],
  [V.reply - 8, 3.2, SCREEN],
  [ROUTE.from, 3.2, SCREEN],
  [ROUTE.from + 16, 0.82, CENTRE],
  [ROUTE.until, 0.82, CENTRE],
  [ROUTE.until + 16, 3.2, SCREEN],
  [V.seed + 18, 3.35, SCREEN],
  [V.seed + 40, 1.05, CENTRE],
  [cue("seed", "to") - 10, 1.05, CENTRE],
  [cue("seed", "to") + 2, 1.35, SEED_VIEW],
  [V.weekend, 1.35, SEED_VIEW],
  [OFFICER_BACK, 2.6, CALL_KEY],
  [cue("officer", "calls") + 4, 2.6, CALL_KEY],
  [cue("officer", "calls") + 18, 2.9, SCREEN],
  [V.alert, 2.9, SCREEN],
  [ALERT_BACK, 3.2, SCREEN],
  [SCENES.story.to, 3.35, SCREEN],
];

/** Where the whole phone sits on the frame, in pixels from centre. */
const PLACE_X: [number, number][] = [
  [V.reply - 8, 0],
  [V.reply + 6, -120],
  [ROUTE.from, -120],
  [ROUTE.from + 16, -560],
  [ROUTE.until, -560],
  [ROUTE.until + 16, -120],
  [V.seed + 18, -120],
  [V.seed + 40, 380],
  [cue("seed", "to") - 10, 380],
  [cue("seed", "to") + 2, 330],
  [V.weekend, 330],
  [V.weekend + 22, OFF],
  [OFFICER_BACK - 12, OFF],
  [OFFICER_BACK, -330],
  [V.alert, -330],
  [V.alert + 16, OFF],
  [ALERT_BACK - 12, OFF],
  [ALERT_BACK, -120],
];

const ROTATE_Y: [number, number][] = [
  [V.texts - 8, -170],
  [V.texts + 24, -8],
  [cue("texts", "text") - 4, 0],
  [ROUTE.from, 0],
  [ROUTE.from + 16, 14],
  [ROUTE.until, 10],
  [ROUTE.until + 16, 0],
  [V.seed + 18, 0],
  [V.seed + 40, -16],
  [cue("seed", "to") - 10, -12],
  [cue("seed", "to") + 2, 0],
  [OFFICER_BACK - 12, -24],
  [OFFICER_BACK, 0],
  [ALERT_BACK - 12, -20],
  [ALERT_BACK, 0],
];

export type Framing = { zoom: number; x: number; y: number; placeX: number; rotateY: number; rotateX: number };

export function framingAt(frame: number): Framing {
  return {
    zoom: track(frame, SHOTS.map(([at, z]) => [at, z])),
    x: track(frame, SHOTS.map(([at, z, p]) => [at, -z * p.x * BASE_SCALE])),
    y: track(frame, SHOTS.map(([at, z, p]) => [at, -z * p.y * BASE_SCALE])),
    placeX: track(frame, PLACE_X),
    rotateY: track(frame, ROTATE_Y),
    rotateX: track(frame, [[V.texts - 8, 10], [V.texts + 24, 0]]),
  };
}

/** The keypad legends' box on the 1920x1080 frame, or null when the phone is off screen. */
export function legendBoxAt(frame: number): { x: number; y: number; width: number; height: number } | null {
  if (frame < SCENES.story.from || frame > SCENES.story.to) return null;
  const view = framingAt(frame);
  if (Math.abs(view.placeX) >= OFF - 1) return null;
  const scale = view.zoom * BASE_SCALE;
  const margin = 50;
  const left = fromCentre({ x: LEGEND_REGION.x - margin, y: LEGEND_REGION.y - margin });
  const x = 960 + view.placeX + view.x + left.x * scale;
  const y = 540 + view.y + left.y * scale;
  return { x, y, width: (LEGEND_REGION.width + 2 * margin) * scale, height: (LEGEND_REGION.height + 2 * margin) * scale };
}

export const PHONE_SIZE = { width: BODY.width * BASE_SCALE, height: BODY.height * BASE_SCALE };
