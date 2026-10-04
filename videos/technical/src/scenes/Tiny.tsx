import { Broadcast, Cloud, Cpu, DeviceMobile, Leaf, SimCard } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Envelope } from "../components/Envelope";
import { FlipPhone } from "../components/FlipPhone";
import { SIZES, SMS_SEGMENTS } from "../data/facts";
import { glide, leave, progress, snap } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const PHONE = { left: 150, top: 250, scale: 0.75 };
const TOWER = { x: 760, y: 460 };
const HUB = { x: 1240, y: 560 };
const DEVICE = { x: 1640, y: 760 };
const CLOUD = { x: 1640, y: 260 };
const LCD_POINT = { x: PHONE.left + 180 * PHONE.scale, y: PHONE.top + 200 * PHONE.scale };

function Node({ x, y, icon: Glyph, label, at, lit, dim }: { x: number; y: number; icon: Icon; label: string; at: number; lit?: boolean; dim?: boolean }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 12);
  return (
    <div className="absolute flex flex-col items-center gap-3" style={{ left: x, top: y, translate: "-50% -50%", opacity: shown * (dim ? 0.35 : 1) }}>
      <div className="flex size-[150px] items-center justify-center rounded-full bg-night-high" style={{ color: lit ? "var(--color-live)" : "var(--color-text)", boxShadow: lit ? "0 0 0 3px var(--color-live), 0 0 60px color-mix(in srgb, var(--color-live) 35%, transparent)" : "0 0 0 2px var(--color-night-line)" }}>
        <Glyph size={76} weight="bold" />
      </div>
      <span className="whitespace-nowrap display-headline text-title text-text">{label}</span>
    </div>
  );
}

function Wire({ from, to, at, dashed }: { from: { x: number; y: number }; to: { x: number; y: number }; at: number; dashed?: boolean }) {
  const frame = useCurrentFrame();
  const drawn = progress(frame, at, 16, glide);
  return (
    <line x1={from.x} y1={from.y} x2={from.x + (to.x - from.x) * drawn} y2={from.y + (to.y - from.y) * drawn} stroke={dashed ? "var(--color-text-faint)" : "var(--color-live)"} strokeWidth={4} strokeDasharray={dashed ? "10 12" : undefined} strokeLinecap="round" />
  );
}

/** The text's round trip: phone to mast to the hub's SIM, answered on the device, back as at most three SMS. */
function Tunnel({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const smsAt = wordAt("tiny", "Texts") - 6;
  const replyAt = wordAt("tiny", "three") - 4;
  const exit = progress(frame, exitAt, 12, leave);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div className="absolute" style={{ left: PHONE.left, top: PHONE.top, scale: String(PHONE.scale), transformOrigin: "0 0", opacity: progress(frame, 0, 12) }}>
        <FlipPhone screen={null} />
      </div>
      <svg className="absolute inset-0" width={1920} height={1080}>
        <Wire from={LCD_POINT} to={TOWER} at={smsAt - 10} />
        <Wire from={TOWER} to={HUB} at={smsAt} />
        <Wire from={HUB} to={DEVICE} at={smsAt + 26} />
        <Wire from={HUB} to={CLOUD} at={smsAt + 26} dashed />
      </svg>
      <Node x={TOWER.x} y={TOWER.y} icon={Broadcast} label="SMS" at={8} />
      <Node x={HUB.x} y={HUB.y} icon={SimCard} label="Hub" at={14} lit />
      <Node x={DEVICE.x} y={DEVICE.y} icon={Cpu} label="Offline" at={20} lit />
      <Node x={CLOUD.x} y={CLOUD.y} icon={Cloud} label="Online" at={26} dim />
      <Envelope from={LCD_POINT} to={TOWER} at={smsAt} duration={14} arc={-40} />
      <Envelope from={TOWER} to={HUB} at={smsAt + 14} duration={14} arc={-40} />
      <Envelope from={HUB} to={DEVICE} at={smsAt + 30} duration={12} arc={0} />
      {Array.from({ length: SMS_SEGMENTS }, (_, index) => (
        <Envelope key={index} from={HUB} to={LCD_POINT} at={replyAt + index * 7} duration={22} arc={-120 - index * 30} />
      ))}
      <p className="absolute left-[150px] top-[880px] display-headline text-headline text-live" style={{ opacity: progress(frame, replyAt + 6, 10) }}>
        ≤ {SMS_SEGMENTS} SMS
      </p>
    </AbsoluteFill>
  );
}

const SHELF_Y = 820;
const BIG_SIDE = 470;
const side = (bytes: number) => Math.sqrt(bytes / SIZES.hubModel) * BIG_SIDE;

function formatSize(bytes: number) {
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(2)} GB` : `${(bytes / 1e6).toFixed(bytes < 1e7 ? 2 : 1)} MB`;
}

/** A file as a block whose area is its size, dropped onto a shelf so the three sizes compare at a glance. */
function SizeBlock({ bytes, x, at, icon: Glyph, lit }: { bytes: number; x: number; at: number; icon: Icon; lit?: boolean }) {
  const frame = useCurrentFrame();
  const drop = progress(frame, at, 14, snap);
  const length = side(bytes);
  const iconSize = Math.max(26, Math.min(120, length * 0.45));
  return (
    <div className="absolute" style={{ left: x, top: SHELF_Y - length - (1 - drop) * 500, opacity: progress(frame, at, 4) }}>
      <div className="flex items-center justify-center" style={{ width: length, height: length, background: lit ? "var(--color-live)" : "var(--color-night-high)", boxShadow: lit ? "0 0 50px var(--color-live)" : "inset 0 0 0 2px var(--color-text-faint)" }}>
        {length > 60 && <Glyph size={iconSize} weight="bold" className={lit ? "text-night" : "text-text"} />}
      </div>
      {length <= 60 && <Glyph size={44} weight="fill" className="absolute text-live" style={{ left: length + 14, top: -8 }} />}
      <p className="absolute whitespace-nowrap font-data text-lead text-text figures" style={{ top: length + 24, left: 0 }}>
        {formatSize(bytes)}
      </p>
    </div>
  );
}

function Sizes({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const hubAt = wordAt("tiny", "gigabytes") - 14;
  const leafAt = wordAt("tiny", "leaf") - 2;
  const appAt = wordAt("tiny", "sixty-eight") - 4;
  return (
    <AbsoluteFill style={{ opacity: progress(frame, at, 10) }}>
      <div className="absolute left-[140px] right-[140px] h-[3px] bg-night-line" style={{ top: SHELF_Y }} />
      <SizeBlock bytes={SIZES.hubModel} x={240} at={hubAt} icon={Cpu} />
      <SizeBlock bytes={SIZES.leafModel} x={1000} at={leafAt} icon={Leaf} lit />
      <SizeBlock bytes={SIZES.app} x={1380} at={appAt} icon={DeviceMobile} />
    </AbsoluteFill>
  );
}

/** Explanation: why it reaches people. The path a text takes, and how small each piece is. */
export function Tiny() {
  const frame = useCurrentFrame();
  const sizesAt = wordAt("tiny", "gigabytes") - 30;
  return (
    <AbsoluteFill className="bg-night">
      <Tunnel exitAt={sizesAt - 6} />
      {frame >= sizesAt && <Sizes at={sizesAt} />}
    </AbsoluteFill>
  );
}
