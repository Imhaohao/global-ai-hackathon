"use client";

import { motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { useRef } from "react";
import { easeDrawn } from "@/lib/motion";

export type FlowFocus = "sent" | "online" | "offline" | "reply" | "photo";

type FlowNode = { id: string; x: number; y: number; title: string; lines: string[] };

const NODE = { width: 320, height: 104 };

const nodes: FlowNode[] = [
  { id: "noor", x: 10, y: 10, title: "Noor's phone", lines: ["A text, or a photo by MMS"] },
  { id: "hub", x: 10, y: 228, title: "Hub phone, officer's station", lines: ["Android with its own SIM"] },
  { id: "online", x: 440, y: 118, title: "Online backend", lines: ["Claude, fixed disease list;", "reads MMS photos"] },
  { id: "offline", x: 440, y: 338, title: "No signal", lines: ["Qwen3.5-2B on the hub reads the", "Swahili; rules pick the disease"] },
  { id: "reply", x: 10, y: 446, title: "Reply SMS to Noor", lines: ["Approved Swahili that asks", "her to confirm"] },
];

const edges = {
  sent: "M 170 114 L 170 228",
  online: "M 330 262 C 390 262 380 170 440 170",
  offline: "M 330 296 C 390 296 380 390 440 390",
  reply: "M 170 332 L 170 446",
  photo: "M 330 50 C 470 50 600 60 600 118",
  photoBack: "M 640 222 C 680 380 520 498 330 498",
};

type EdgeName = keyof typeof edges;

const activeEdges: Record<FlowFocus, EdgeName[]> = {
  sent: ["sent"],
  online: ["sent", "online", "reply"],
  offline: ["sent", "offline", "reply"],
  reply: ["reply"],
  photo: ["photo", "photoBack"],
};

const activeNodes: Record<FlowFocus, string[]> = {
  sent: ["noor", "hub"],
  online: ["hub", "online"],
  offline: ["hub", "offline"],
  reply: ["offline", "reply"],
  photo: ["noor", "online", "reply"],
};

function TravellingDot({ path }: { path: string }) {
  const circle = useRef<SVGCircleElement>(null);
  const measure = useRef<SVGPathElement>(null);
  const still = useReducedMotion();
  useAnimationFrame((time) => {
    const element = measure.current;
    if (!element || !circle.current) return;
    const length = element.getTotalLength();
    const progress = still ? 1 : (time / 1800) % 1;
    const point = element.getPointAtLength(progress * length);
    circle.current.setAttribute("cx", String(point.x));
    circle.current.setAttribute("cy", String(point.y));
  });
  return (
    <>
      <path ref={measure} d={path} fill="none" stroke="none" />
      <circle ref={circle} r={7} className="fill-rust" style={{ filter: "drop-shadow(0 0 6px var(--color-rust-glow))" }} />
    </>
  );
}

function Node({ node, active, index }: { node: FlowNode; active: boolean; index: number }) {
  return (
    <motion.g
      variants={{ enter: { opacity: 0, y: 12 }, present: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeDrawn, delay: 0.2 + index * 0.08 } }, exit: { opacity: 0 } }}
    >
      <rect x={node.x} y={node.y} width={NODE.width} height={NODE.height} rx={16} className={active ? "fill-paper-raised" : "fill-paper-sunken"} style={{ transition: "fill 300ms" }} />
      {active && <rect x={node.x} y={node.y + 18} width={5} height={NODE.height - 36} rx={2.5} className="fill-rust" />}
      <text x={node.x + 24} y={node.y + 38} className={`font-body font-bold ${active ? "fill-ink" : "fill-ink-muted"}`} fontSize={23}>
        {node.title}
      </text>
      {node.lines.map((line, lineIndex) => (
        <text key={line} x={node.x + 24} y={node.y + 68 + lineIndex * 24} className="fill-ink-muted font-body" fontSize={19}>
          {line}
        </text>
      ))}
    </motion.g>
  );
}

export function SmsFlow({ focus }: { focus: FlowFocus }) {
  const lit = new Set(activeEdges[focus]);
  const litNodes = new Set(activeNodes[focus]);
  return (
    <svg viewBox="0 0 770 560" role="img" aria-label="Noor's text goes to the hub phone, which answers online through the backend or offline on the phone, then replies by SMS" className="h-deck-diagram w-auto max-w-full overflow-visible">
      {(Object.keys(edges) as EdgeName[]).map((name) => (
        <motion.path
          key={name}
          d={edges[name]}
          fill="none"
          strokeWidth={lit.has(name) ? 3.5 : 2}
          strokeLinecap="round"
          className={lit.has(name) ? "stroke-ink" : "stroke-rule"}
          strokeDasharray={lit.has(name) ? undefined : "5 7"}
          variants={{ enter: { pathLength: 0 }, present: { pathLength: 1, transition: { duration: 0.9, ease: easeDrawn, delay: 0.5 } }, exit: { opacity: 0 } }}
        />
      ))}
      {nodes.map((node, index) => (
        <Node key={node.id} node={node} active={litNodes.has(node.id)} index={index} />
      ))}
      {activeEdges[focus].map((name) => (
        <TravellingDot key={`${focus}-${name}`} path={edges[name]} />
      ))}
    </svg>
  );
}
