"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Group, MeshBasicMaterial, type Color } from "three";
import { rustLeafCentres } from "./shots";
import { useStageLevels } from "./stageLevels";

const STAGGER = 1 / rustLeafCentres.length;

export function ScanRings({ glow }: { glow: Color }) {
  const levels = useStageLevels();
  const rings = useRef<(Group | null)[]>([]);
  const materials = useMemo(
    () => rustLeafCentres.map(() => new MeshBasicMaterial({ color: glow, transparent: true, depthTest: false, toneMapped: false, opacity: 0 })),
    [glow],
  );

  useFrame(({ clock }) => {
    rustLeafCentres.forEach((_, index) => {
      const ring = rings.current[index];
      if (!ring) return;
      const local = Math.min(1, Math.max(0, (levels.scan - index * STAGGER * 0.8) / (STAGGER * 1.4)));
      const breathe = 1 + 0.06 * Math.sin(clock.elapsedTime * 2.4 + index);
      ring.scale.setScalar((0.6 + 0.4 * local) * breathe);
      materials[index].opacity = 0.9 * local;
      materials[index].visible = local > 0.01;
    });
  });

  return rustLeafCentres.map((centre, index) => (
    <Billboard key={index} position={centre}>
      <group ref={(node) => { rings.current[index] = node; }}>
        <mesh material={materials[index]} renderOrder={5}>
          <ringGeometry args={[0.044, 0.049, 48]} />
        </mesh>
      </group>
    </Billboard>
  ));
}
