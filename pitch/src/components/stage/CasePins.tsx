"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, MeshBasicMaterial, Object3D, type Color } from "three";
import { bushTops, type Triple } from "./shots";
import { useStageLevels } from "./stageLevels";

const OUTBREAK_CENTRE = { x: 3, z: 6 };
const CASE_COUNT = 46;
const RISE = 2.4;

type Case = { position: Triple; order: number };

function pickCases(): Case[] {
  const scored = bushTops.map((position, index) => {
    const distance = Math.hypot(position[0] - OUTBREAK_CENTRE.x, (position[2] - OUTBREAK_CENTRE.z) * 0.8);
    const jitter = ((index * 7919) % 97) / 97;
    return { position, score: distance + jitter * 9 };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, CASE_COUNT).map((entry, order) => ({ position: entry.position, order: order / CASE_COUNT }));
}

export function CasePins({ glow, rust }: { glow: Color; rust: Color }) {
  const levels = useStageLevels();
  const cases = useMemo(() => pickCases(), []);
  const heads = useRef<InstancedMesh>(null);
  const stems = useRef<InstancedMesh>(null);
  const holder = useMemo(() => new Object3D(), []);
  const headMaterial = useMemo(() => new MeshBasicMaterial({ color: rust, toneMapped: false }), [rust]);
  const stemMaterial = useMemo(() => new MeshBasicMaterial({ color: glow, toneMapped: false, transparent: true, opacity: 0.7, depthWrite: false }), [glow]);

  useLayoutEffect(() => {
    if (heads.current) heads.current.count = cases.length;
    if (stems.current) stems.current.count = cases.length;
  }, [cases]);

  useFrame(({ clock }) => {
    if (!heads.current || !stems.current) return;
    cases.forEach((entry, index) => {
      const local = Math.min(1, Math.max(0, (levels.pins * 1.3 - entry.order) / 0.3));
      const [x, y, z] = entry.position;
      const pulse = 1 + 0.15 * Math.sin(clock.elapsedTime * 3 + index);
      holder.position.set(x, y + RISE * local, z);
      holder.scale.setScalar(0.42 * local * pulse);
      holder.updateMatrix();
      heads.current!.setMatrixAt(index, holder.matrix);
      holder.position.set(x, y + (RISE * local) / 2, z);
      holder.scale.set(0.06 * local, RISE * local + 0.001, 0.06 * local);
      holder.updateMatrix();
      stems.current!.setMatrixAt(index, holder.matrix);
    });
    heads.current.instanceMatrix.needsUpdate = true;
    stems.current.instanceMatrix.needsUpdate = true;
    heads.current.visible = stems.current.visible = levels.pins > 0.01;
  });

  return (
    <>
      <instancedMesh ref={heads} args={[undefined, headMaterial, CASE_COUNT]} renderOrder={4} frustumCulled={false}>
        <sphereGeometry args={[1, 16, 12]} />
      </instancedMesh>
      <instancedMesh ref={stems} args={[undefined, stemMaterial, CASE_COUNT]} renderOrder={3} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
      </instancedMesh>
    </>
  );
}
