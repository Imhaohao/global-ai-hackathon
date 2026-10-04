"use client";

import { Translate, User, WifiSlash } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { easeDrawn } from "@/lib/motion";

const tools = ["Leaf-scanning apps", "Cloud AI models", "Plant clinics and soil labs", "Extension advice"];

const ROW_GAP = 92;
const FIRST_ROW = 60;
const TOOL_RIGHT = 300;
const INTERNET_GATE = 430;
const LOCAL_GATE = 580;
const NOOR_X = 720;
const NOOR_Y = FIRST_ROW + (ROW_GAP * (tools.length - 1)) / 2;

/** Which gate stops each tool: the first two need a connection, the last two need a local fit. */
const stoppedAt = [INTERNET_GATE, INTERNET_GATE, LOCAL_GATE, LOCAL_GATE];

function rowY(index: number) {
  return FIRST_ROW + index * ROW_GAP;
}

function routePath(index: number) {
  const y = rowY(index);
  return `M ${TOOL_RIGHT} ${y} L ${LOCAL_GATE + 30} ${y} C ${LOCAL_GATE + 90} ${y}, ${LOCAL_GATE + 60} ${NOOR_Y}, ${NOOR_X - 34} ${NOOR_Y}`;
}

function Gate({ x, label, icon, delay }: { x: number; label: string[]; icon: "internet" | "local"; delay: number }) {
  const Icon = icon === "internet" ? WifiSlash : Translate;
  return (
    <motion.g variants={{ enter: { opacity: 0 }, present: { opacity: 1, transition: { duration: 0.6, delay } }, exit: { opacity: 0 } }}>
      <rect x={x - 5} y={FIRST_ROW - 46} width={10} height={ROW_GAP * (tools.length - 1) + 92} rx={2} className="fill-ink" />
      <Icon x={x - 16} y={FIRST_ROW - 92} width={32} height={32} className="text-ink" />
      {label.map((line, index) => (
        <text key={line} x={x} y={ROW_GAP * tools.length + FIRST_ROW + index * 28} textAnchor="middle" className="fill-ink font-body font-bold" fontSize={24}>
          {line}
        </text>
      ))}
    </motion.g>
  );
}

function BlockedDot({ index, still }: { index: number; still: boolean }) {
  const y = rowY(index);
  const stop = stoppedAt[index] - 14;
  const timing = { duration: 2.6, delay: 1.4 + index * 0.35, repeat: still ? 0 : Infinity, repeatDelay: 0.8, ease: "easeInOut" as const };
  return (
    <motion.circle
      r={7}
      cy={y}
      className="fill-rust"
      style={{ filter: "drop-shadow(0 0 6px var(--color-rust-glow))" }}
      initial={{ cx: TOOL_RIGHT, opacity: 0 }}
      animate={still ? { cx: stop, opacity: 1 } : { cx: [TOOL_RIGHT, stop, stop], opacity: [1, 1, 0] }}
      transition={still ? { duration: 0 } : { ...timing, times: [0, 0.7, 1] }}
    />
  );
}

export function AccessGap() {
  const still = useReducedMotion() ?? false;
  return (
    <svg viewBox="0 -60 760 520" role="img" aria-label="Four kinds of crop help on the left. Two stop at a wall marked no reliable internet, two at a wall marked no local fit. None reaches Noor." className="h-deck-diagram w-auto max-w-full overflow-visible">
      {tools.map((tool, index) => (
        <motion.g key={tool} variants={{ enter: { opacity: 0, x: -16 }, present: { opacity: 1, x: 0, transition: { duration: 0.7, ease: easeDrawn, delay: 0.2 + index * 0.1 } }, exit: { opacity: 0 } }}>
          <rect x={0} y={rowY(index) - 30} width={TOOL_RIGHT} height={60} rx={14} className="fill-paper-raised" />
          <text x={20} y={rowY(index) + 7} className="fill-ink font-body" fontSize={24}>
            {tool}
          </text>
          <path d={routePath(index)} fill="none" strokeWidth={2} strokeDasharray="4 7" className="stroke-ink-faint" />
        </motion.g>
      ))}
      <Gate x={INTERNET_GATE} label={["No reliable", "internet"]} icon="internet" delay={0.8} />
      <Gate x={LOCAL_GATE} label={["No local", "fit"]} icon="local" delay={1.0} />
      <motion.g variants={{ enter: { opacity: 0 }, present: { opacity: 1, transition: { duration: 0.6, delay: 1.2 } }, exit: { opacity: 0 } }}>
        <circle cx={NOOR_X} cy={NOOR_Y} r={34} className="fill-leaf" />
        <User x={NOOR_X - 18} y={NOOR_Y - 18} width={36} height={36} className="text-on-leaf" weight="bold" />
        <text x={NOOR_X} y={NOOR_Y + 66} textAnchor="middle" className="fill-ink font-body font-bold" fontSize={24}>
          Noor
        </text>
      </motion.g>
      {tools.map((tool, index) => (
        <BlockedDot key={tool} index={index} still={still} />
      ))}
    </svg>
  );
}
