import anchors from "@assets/stage/anchors.json";

export type Triple = [number, number, number];

export type FeatureScreen = "idle" | "sent" | "reply";

export type StageLevels = {
  rustGlow: number;
  scan: number;
  pins: number;
  mist: number;
  frameShift: number;
  frameDrop: number;
  sway: number;
};

export type Shot = {
  cameraPosition: Triple;
  cameraTarget: Triple;
  fov: number;
  fogNear: number;
  fogFar: number;
  levels: StageLevels;
  featureScreen: FeatureScreen;
};

function add(a: readonly number[], b: readonly number[], scale = 1): Triple {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale];
}

const heroLeaf = anchors.rustLeaves[0];
const heroBush = anchors.points.heroBush;
const featureScreen = anchors.screens.FeaturePhoneScreen;
const hubScreen = anchors.screens.HubPhoneScreen;
const officerScreen = anchors.screens.OfficerPhoneScreen;
const cooperative = anchors.points.cooperative;
const motorbike = anchors.points.motorbike;

const calm: StageLevels = { rustGlow: 0, scan: 0, pins: 0, mist: 0.6, frameShift: 0, frameDrop: 0, sway: 1 };

const wideFog = { fogNear: 40, fogFar: 230 };
const closeFog = { fogNear: 8, fogFar: 70 };

function shot(camera: { cameraPosition: Triple; cameraTarget: Triple; fov?: number }, levels: Partial<StageLevels> = {}, extra: Partial<Shot> = {}): Shot {
  return { fov: 30, ...wideFog, ...camera, levels: { ...calm, ...levels }, featureScreen: "idle", ...extra };
}

const leafCamera = {
  cameraPosition: add(add(heroLeaf.centre, heroLeaf.normal, 0.3), [0.02, 0.04, 0.16]),
  cameraTarget: add(heroLeaf.centre, [0, -0.01, 0]),
  fov: 34,
};

const bushCamera = {
  cameraPosition: add(heroBush, [0.55, 1.55, 2.05]),
  cameraTarget: add(heroBush, [0.22, 0.92, 0.25]),
  fov: 32,
};

const featureCamera = {
  cameraPosition: add(featureScreen.centre, [0.03, 0.28, 0.21]),
  cameraTarget: add(featureScreen.centre, [0, -0.01, -0.01]),
  fov: 30,
};

const hubCamera = {
  cameraPosition: add(add(hubScreen.centre, hubScreen.normal, 0.42), [0.06, 0.06, 0]),
  cameraTarget: add(hubScreen.centre, [0, -0.015, 0]),
  fov: 30,
};

export const shots = {
  title: shot({ cameraPosition: [3, 2.6, 36], cameraTarget: [0, 15.5, -20], fov: 34 }, { mist: 1, frameDrop: 0 }),
  morning: shot({ cameraPosition: [14, 10, 26], cameraTarget: [1, 5, -4], fov: 32 }, { mist: 0.5, frameShift: 0.16 }),
  morningRust: shot({ cameraPosition: add(heroBush, [2.3, 1.7, 3.3]), cameraTarget: add(heroBush, [0.15, 0.85, 0.35]), fov: 30 }, { rustGlow: 1, mist: 0, frameShift: 0.16, sway: 0.4 }, closeFog),
  aerial: shot({ cameraPosition: [4, 68, 44], cameraTarget: [0, 2, -6], fov: 36 }, { mist: 0.2, frameShift: -0.2, sway: 0.4 }, { fogNear: 80, fogFar: 300 }),
  rows: shot({ cameraPosition: [-1.2, 4.2, 10.5], cameraTarget: [2.2, 3.4, -2], fov: 34 }, { mist: 0.15, frameShift: -0.18 }, closeFog),
  leaf: shot(leafCamera, { rustGlow: 1, mist: 0, frameShift: -0.2, sway: 0.25 }, closeFog),
  bush: shot(bushCamera, { rustGlow: 0.6, mist: 0, frameShift: -0.2, sway: 0.3 }, closeFog),
  bushScan: shot(bushCamera, { rustGlow: 1, scan: 1, mist: 0, frameShift: -0.2, sway: 0.3 }, closeFog),
  featureIdle: shot(featureCamera, { mist: 0, frameShift: -0.2, sway: 0.15 }, { ...closeFog, featureScreen: "idle" }),
  featureSent: shot(featureCamera, { mist: 0, frameShift: -0.2, sway: 0.15 }, { ...closeFog, featureScreen: "sent" }),
  featureReply: shot(featureCamera, { mist: 0, frameShift: -0.2, sway: 0.15 }, { ...closeFog, featureScreen: "reply" }),
  hub: shot(hubCamera, { mist: 0, frameShift: 0.2, sway: 0.15 }, { ...closeFog, featureScreen: "reply" }),
  cooperative: shot({ cameraPosition: add(cooperative, [9, 4.2, 15]), cameraTarget: add(cooperative, [2.5, 1.2, 2]), fov: 32 }, { mist: 0.3, frameShift: 0.16 }, { ...closeFog, featureScreen: "reply" }),
  officer: shot({ cameraPosition: add(motorbike, [3.4, 1.7, 3.6]), cameraTarget: add(motorbike, [-0.2, 0.75, -0.2]), fov: 30 }, { mist: 0.2, frameShift: -0.18 }, closeFog),
  officerPhone: shot({ cameraPosition: add(officerScreen.centre, [1.55, 0.5, 1.15]), cameraTarget: add(officerScreen.centre, [-0.1, -0.22, 0]), fov: 30 }, { mist: 0, frameShift: -0.2, sway: 0.15 }, closeFog),
  map: shot({ cameraPosition: [2, 74, 22], cameraTarget: [0, 0, -4], fov: 34 }, { pins: 1, mist: 0.2, frameShift: 0.2, sway: 0.3 }, { fogNear: 90, fogFar: 320 }),
  closing: shot({ cameraPosition: [-30, 6, 92], cameraTarget: [-2, 16, -10], fov: 34 }, { mist: 1, rustGlow: 0.4, frameShift: 0, sway: 1 }, { fogNear: 60, fogFar: 260 }),
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof shots;

export const levelNames = Object.keys(calm) as (keyof StageLevels)[];

export const rustLeafCentres = anchors.rustLeaves.map((leaf) => leaf.centre as Triple);
export const bushTops = anchors.bushes as Triple[];
export const cooperativePoint = cooperative as Triple;
