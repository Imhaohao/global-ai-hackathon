"use client";

import { CellTower, Cloud, DeviceMobile, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { easeDrawn } from "@/lib/motion";

const CLOUD_ROW = 70;
const DEVICE_ROW = 290;
const PHONE_X = 40;
const TOWER_X = 330;
const CLOUD_X = 600;
const ICON = 64;

function appear(delay: number) {
  return { enter: { opacity: 0, y: 10 }, present: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeDrawn, delay } }, exit: { opacity: 0 } };
}

function Label({ x, y, lines, strong = false }: { x: number; y: number; lines: string[]; strong?: boolean }) {
  return lines.map((line, index) => (
    <text key={line} x={x} y={y + index * 24} textAnchor="middle" className={`font-body ${strong ? "fill-ink font-bold" : "fill-ink-muted"}`} fontSize={20}>
      {line}
    </text>
  ));
}

function CloudRow({ still }: { still: boolean }) {
  const startX = PHONE_X + ICON + 8;
  const stopX = TOWER_X - 12;
  return (
    <motion.g variants={appear(0.2)}>
      <text x={0} y={CLOUD_ROW - 54} className="fill-ink font-body font-bold" fontSize={22}>
        Cloud AI
      </text>
      <DeviceMobile x={PHONE_X} y={CLOUD_ROW - ICON / 2} width={ICON} height={ICON} className="text-ink-muted" />
      <line x1={startX} y1={CLOUD_ROW} x2={CLOUD_X - 12} y2={CLOUD_ROW} strokeWidth={2} strokeDasharray="5 8" className="stroke-ink-faint" />
      <CellTower x={TOWER_X - ICON / 2} y={CLOUD_ROW - ICON / 2} width={ICON} height={ICON} className="text-ink-muted" />
      <X x={TOWER_X + 10} y={CLOUD_ROW - 46} width={30} height={30} weight="bold" className="text-rust-deep" />
      <Cloud x={CLOUD_X} y={CLOUD_ROW - ICON / 2} width={ICON} height={ICON} className="text-ink-faint" />
      <Label x={TOWER_X} y={CLOUD_ROW + 62} lines={["Needs a signal and", "data for every question"]} />
      <Label x={CLOUD_X + ICON / 2} y={CLOUD_ROW + 62} lines={["Model in a", "data centre"]} />
      <motion.circle
        r={7}
        cy={CLOUD_ROW}
        className="fill-rust"
        style={{ filter: "drop-shadow(0 0 6px var(--color-rust-glow))" }}
        initial={{ cx: startX, opacity: 0 }}
        animate={still ? { cx: stopX, opacity: 1 } : { cx: [startX, stopX, stopX], opacity: [1, 1, 0] }}
        transition={still ? { duration: 0 } : { duration: 2.2, times: [0, 0.75, 1], repeat: Infinity, repeatDelay: 0.6, delay: 1, ease: "easeInOut" }}
      />
    </motion.g>
  );
}

function DeviceRow({ still, sizeLabel }: { still: boolean; sizeLabel: string }) {
  const loop = { cx: [PHONE_X + 150, PHONE_X + 290, PHONE_X + 150], cy: [DEVICE_ROW, DEVICE_ROW, DEVICE_ROW] };
  return (
    <motion.g variants={appear(0.5)}>
      <text x={0} y={DEVICE_ROW - 74} className="fill-ink font-body font-bold" fontSize={22}>
        Leaf Doctor
      </text>
      <rect x={PHONE_X} y={DEVICE_ROW - 46} width={420} height={92} rx={22} className="fill-leaf-soft" />
      <DeviceMobile x={PHONE_X + 14} y={DEVICE_ROW - ICON / 2} width={ICON} height={ICON} className="text-leaf" weight="fill" />
      <rect x={PHONE_X + 300} y={DEVICE_ROW - 24} width={104} height={48} rx={12} className="fill-leaf" />
      <text x={PHONE_X + 352} y={DEVICE_ROW + 7} textAnchor="middle" className="fill-on-leaf font-body font-bold" fontSize={20}>
        {sizeLabel}
      </text>
      <motion.circle
        r={7}
        className="fill-rust"
        style={{ filter: "drop-shadow(0 0 6px var(--color-rust-glow))" }}
        initial={{ cx: PHONE_X + 150, cy: DEVICE_ROW }}
        animate={still ? { cx: PHONE_X + 220, cy: DEVICE_ROW } : loop}
        transition={still ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
      />
      <Label x={PHONE_X + 210} y={DEVICE_ROW + 82} lines={["Model on the phone. No signal, no data bundle."]} strong />
    </motion.g>
  );
}

export function CloudVsDevice({ sizeLabel }: { sizeLabel: string }) {
  const still = useReducedMotion() ?? false;
  return (
    <svg viewBox="0 -10 680 400" role="img" aria-label={`Cloud AI needs a phone signal to reach a data centre, and stops when the signal drops. Leaf Doctor's ${sizeLabel} model answers on the phone itself.`} className="w-deck-column overflow-visible">
      <CloudRow still={still} />
      <DeviceRow still={still} sizeLabel={sizeLabel} />
    </svg>
  );
}
