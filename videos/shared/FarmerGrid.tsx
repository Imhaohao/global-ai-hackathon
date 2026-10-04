// The shared opening and closing motif of the Leaf Doctor videos: 100 farmers, one per 1% of rural Kenyan adults.
// Self-contained on purpose (react, remotion and @phosphor-icons/react only), so each video project copies it as is.
//
// Opening: 38 farmers swap their smartphone for a basic text phone (Global Findex 2024: 38.4% of rural adults use a
// basic text phone as their main phone), then 66 lose their signal bars (Findex 2024: 33.7% of rural adults use the
// internet daily, so about 66 in 100 do not). With `reachAt`, a text then reaches every farmer anyway. Closing: an SMS wave lights every farmer, then the grid folds into the
// Leaf Doctor mark. The caller renders any numbers or words; this component draws only the picture.
import { CellSignalFull, CellSignalSlash, ChatCircleText } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";

export const FARMER_COUNT = 100;
export const BASIC_PHONE_FARMERS = 38;
export const OFFLINE_FARMERS = 66;

export type FarmerGridColours = {
  farmer: string;
  device: string;
  signal: string;
  signalLost: string;
  lit: string;
  leaf: string;
  spore: string;
};

const DEFAULT_COLOURS: FarmerGridColours = {
  farmer: "#d9d6cc",
  device: "#8c877c",
  signal: "#d9d6cc",
  signalLost: "#f0641e",
  lit: "#7fd39b",
  leaf: "#1f5135",
  spore: "#ffb347",
};

type OpeningTiming = {
  stage: "opening";
  /** Frame at which the 38 basic phones start to appear (they arrive over `swapFrames`). */
  phonesAt: number;
  /** Frame at which the 66 signal bars start to drop. */
  signalAt: number;
  /** Optional frame at which a text reaches every farmer anyway, lighting the grid without folding it. */
  reachAt?: number;
};

type ClosingTiming = {
  stage: "closing";
  /** Frame at which the SMS wave leaves the centre of the grid. */
  lightAt: number;
  /** Frame at which the farmers start to fold into the Leaf Doctor mark. */
  closeAt: number;
};

export type FarmerGridProps = (OpeningTiming | ClosingTiming) & {
  /** Width and height of the square grid, in pixels. */
  size?: number;
  /** Frames over which a staggered change runs through all affected farmers. */
  swapFrames?: number;
  colours?: Partial<FarmerGridColours>;
};

const COLUMNS = 10;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const settle = Easing.bezier(0.16, 1, 0.3, 1);
const glide = Easing.bezier(0.65, 0, 0.35, 1);

/** A stable shuffled order of the 100 farmers, so the same people change in every render and in both videos. */
const ORDER = Array.from({ length: FARMER_COUNT }, (_, index) => index).sort((a, b) => random(`farmer-${a}`) - random(`farmer-${b}`));
const RANK = ORDER.reduce<number[]>((ranks, farmer, rank) => {
  ranks[farmer] = rank;
  return ranks;
}, []);

/** The 38 basic-phone farmers are also among the 66 without daily internet. */
const hasBasicPhone = (farmer: number) => RANK[farmer] < BASIC_PHONE_FARMERS;
const isOffline = (farmer: number) => RANK[farmer] < OFFLINE_FARMERS;

function staggered(frame: number, start: number, rank: number, count: number, span: number) {
  const delay = (rank / Math.max(count - 1, 1)) * span * 0.75;
  return interpolate(frame, [start + delay, start + delay + span * 0.25], [0, 1], { ...clamp, easing: settle });
}

function Farmer({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 40 48" width="100%" height="100%" aria-hidden>
      <ellipse cx="20" cy="9" rx="15" ry="3.4" fill={colour} />
      <path d="M12 9 Q12 2 20 2 Q28 2 28 9 Z" fill={colour} />
      <circle cx="20" cy="15" r="6.5" fill={colour} />
      <path d="M6 46 Q6 25 20 25 Q34 25 34 46 Z" fill={colour} />
    </svg>
  );
}

function Smartphone({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 14 24" width="100%" height="100%" aria-hidden>
      <rect x="1" y="1" width="12" height="22" rx="2.6" fill="none" stroke={colour} strokeWidth="1.8" />
      <rect x="3" y="3.5" width="8" height="16" rx="1" fill={colour} opacity="0.45" />
    </svg>
  );
}

/** The basic text phone glyph the grid uses, exported so a caption beside the grid can match it. */
export function BasicPhone({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 14 24" width="100%" height="100%" aria-hidden>
      <rect x="1" y="1" width="12" height="22" rx="3.2" fill={colour} />
      <rect x="3" y="3.5" width="8" height="6" rx="0.8" fill="#c8d2b4" />
      <rect x="3" y="12" width="8" height="8.5" rx="1.2" fill="#1e2418" opacity="0.55" />
    </svg>
  );
}

type CellState = { basic: number; lost: number; lit: number };

function Cell({ farmer, state, cell, colours }: { farmer: number; state: CellState; cell: number; colours: FarmerGridColours }) {
  const device = cell * 0.26;
  const signalColour = state.lost > 0.5 ? colours.signalLost : colours.signal;
  const glow = state.lit > 0 ? `drop-shadow(0 0 ${cell * 0.12 * state.lit}px ${colours.lit})` : "none";
  const farmerColour = state.lit > 0.5 ? colours.lit : colours.farmer;
  return (
    <div style={{ position: "relative", width: cell, height: cell, filter: glow }} data-farmer={farmer}>
      <div style={{ position: "absolute", left: cell * 0.12, top: cell * 0.16, width: cell * 0.58, height: cell * 0.7 }}>
        <Farmer colour={farmerColour} />
      </div>
      <div style={{ position: "absolute", right: cell * 0.1, bottom: cell * 0.12, width: device * 0.62, height: device }}>
        <div style={{ position: "absolute", inset: 0, opacity: 1 - state.basic }}>
          <Smartphone colour={colours.device} />
        </div>
        <div style={{ position: "absolute", inset: 0, opacity: state.basic, scale: 0.6 + 0.4 * state.basic }}>
          <BasicPhone colour={colours.device} />
        </div>
      </div>
      <div style={{ position: "absolute", right: cell * 0.06, top: cell * 0.06, width: cell * 0.26, height: cell * 0.26, color: signalColour }}>
        <SignalIcon state={state} size={cell * 0.26} colours={colours} />
      </div>
    </div>
  );
}

function SignalIcon({ state, size, colours }: { state: CellState; size: number; colours: FarmerGridColours }) {
  if (state.lit > 0.5) return <ChatCircleText size={size} weight="fill" color={colours.lit} />;
  if (state.lost > 0.5) return <CellSignalSlash size={size} weight="bold" style={{ opacity: state.lost }} />;
  return <CellSignalFull size={size} weight="bold" style={{ opacity: 1 - state.lost * 0.6 }} />;
}

/** The SMS wave: it leaves the centre of the grid at `start` and reaches the corners after most of `span`. */
function waveLight(frame: number, farmer: number, start: number, span: number) {
  const row = Math.floor(farmer / COLUMNS) - 4.5;
  const column = (farmer % COLUMNS) - 4.5;
  const reach = Math.hypot(row, column) / Math.hypot(4.5, 4.5);
  return interpolate(frame, [start + reach * span * 0.8, start + reach * span * 0.8 + 6], [0, 1], { ...clamp, easing: settle });
}

function openingState(frame: number, farmer: number, timing: OpeningTiming, span: number): CellState {
  const basic = hasBasicPhone(farmer) ? staggered(frame, timing.phonesAt, RANK[farmer], BASIC_PHONE_FARMERS, span) : 0;
  const lost = isOffline(farmer) ? staggered(frame, timing.signalAt, RANK[farmer], OFFLINE_FARMERS, span) : 0;
  const lit = timing.reachAt === undefined ? 0 : waveLight(frame, farmer, timing.reachAt, span);
  return { basic, lost, lit };
}

function closingState(frame: number, farmer: number, timing: ClosingTiming, span: number): CellState {
  return { basic: hasBasicPhone(farmer) ? 1 : 0, lost: isOffline(farmer) ? 1 : 0, lit: waveLight(frame, farmer, timing.lightAt, span) };
}

/** Points on the outline of a leaf, rotated like a leaf on a branch, one per farmer. */
function leafPoint(farmer: number, size: number) {
  const side = farmer < FARMER_COUNT / 2 ? 1 : -1;
  const along = (farmer % (FARMER_COUNT / 2)) / (FARMER_COUNT / 2 - 1);
  const height = size * 0.78;
  const halfWidth = size * 0.24 * Math.pow(Math.sin(Math.PI * along), 0.85);
  const x = side * halfWidth;
  const y = height / 2 - along * height;
  const angle = (-32 * Math.PI) / 180;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}

function LeafMark({ size, colours, shown }: { size: number; colours: FarmerGridColours; shown: number }) {
  const style: CSSProperties = { position: "absolute", inset: 0, opacity: shown, scale: 0.92 + 0.08 * shown };
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} style={style} aria-hidden>
      <g transform="rotate(32)">
        <path d="M0 39 C 26 22, 26 -18, 0 -39 C -26 -18, -26 22, 0 39 Z" fill={colours.leaf} stroke={colours.lit} strokeWidth="1.2" />
        <path d="M0 39 L0 -33" stroke={colours.lit} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        {[-20, -6, 8, 22].map((y) => (
          <path key={y} d={`M0 ${y} Q 9 ${y - 6} 15 ${y - 12} M0 ${y} Q -9 ${y - 6} -15 ${y - 12}`} stroke={colours.lit} strokeWidth="0.9" fill="none" opacity="0.55" />
        ))}
      </g>
      <circle cx="17" cy="-4" r="4.2" fill={colours.spore} style={{ filter: `drop-shadow(0 0 3px ${colours.spore})` }} />
    </svg>
  );
}

/** 100 farmers, one per 1% of rural Kenyan adults: the access gap opening, and everyone reached closing. */
export function FarmerGrid(props: FarmerGridProps) {
  const frame = useCurrentFrame();
  const size = props.size ?? 720;
  const span = props.swapFrames ?? 36;
  const colours = { ...DEFAULT_COLOURS, ...props.colours };
  const cell = size / COLUMNS;
  const fold = props.stage === "closing" ? interpolate(frame, [props.closeAt, props.closeAt + 30], [0, 1], { ...clamp, easing: glide }) : 0;
  const markShown = props.stage === "closing" ? interpolate(frame, [props.closeAt + 24, props.closeAt + 40], [0, 1], { ...clamp, easing: settle }) : 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {Array.from({ length: FARMER_COUNT }, (_, farmer) => {
        const state = props.stage === "opening" ? openingState(frame, farmer, props, span) : closingState(frame, farmer, props, span);
        const home = { x: (farmer % COLUMNS) * cell + cell / 2 - size / 2, y: Math.floor(farmer / COLUMNS) * cell + cell / 2 - size / 2 };
        const target = leafPoint(farmer, size);
        const x = home.x + (target.x - home.x) * fold;
        const y = home.y + (target.y - home.y) * fold;
        return (
          <div key={farmer} style={{ position: "absolute", left: size / 2 + x - cell / 2, top: size / 2 + y - cell / 2, scale: 0.12 + 0.88 * Math.pow(1 - Math.min(fold * 1.6, 1), 2), opacity: 1 - markShown * 0.9 }}>
            <Cell farmer={farmer} state={state} cell={cell} colours={colours} />
          </div>
        );
      })}
      {props.stage === "closing" && <LeafMark size={size} colours={colours} shown={markShown} />}
    </div>
  );
}
