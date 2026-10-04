"use client";

import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { createContext, useContext, useState, type ReactNode } from "react";
import { levelNames, shots, type ShotName, type StageLevels } from "./shots";

const smoothTimeByLevel: Record<keyof StageLevels, number> = {
  rustGlow: 0.7,
  scan: 0.9,
  pins: 1.6,
  mist: 1.2,
  frameShift: 0.9,
  frameDrop: 0.9,
  sway: 1.2,
};

const LONGEST_FRAME_SECONDS = 1 / 20;
const INSTANT_SECONDS = 0.0001;
const StageLevelsContext = createContext<StageLevels | null>(null);

export function StageLevelsProvider({ shot, instant, children }: { shot: ShotName; instant: boolean; children: ReactNode }) {
  const [levels] = useState<StageLevels>(() => ({ ...shots[shot].levels }));

  useFrame((_, delta) => {
    const target = shots[shot].levels;
    const step = Math.min(delta, LONGEST_FRAME_SECONDS);
    for (const name of levelNames) {
      easing.damp(levels, name, target[name], instant ? INSTANT_SECONDS : smoothTimeByLevel[name], step);
    }
  }, -1);

  return <StageLevelsContext.Provider value={levels}>{children}</StageLevelsContext.Provider>;
}

export function useStageLevels() {
  const levels = useContext(StageLevelsContext);
  if (!levels) throw new Error("useStageLevels needs a StageLevelsProvider");
  return levels;
}
