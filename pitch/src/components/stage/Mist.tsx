"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, type Color } from "three";
import { useStageLevels } from "./stageLevels";

type Bank = { position: [number, number, number]; width: number; height: number; drift: number; opacity: number };

const banks: Bank[] = [
  { position: [-14, 9, -24], width: 70, height: 14, drift: 0.35, opacity: 0.75 },
  { position: [18, 13, -40], width: 80, height: 16, drift: -0.25, opacity: 0.7 },
  { position: [0, 19, -62], width: 120, height: 22, drift: 0.2, opacity: 0.85 },
  { position: [-24, 26, -90], width: 160, height: 30, drift: 0.15, opacity: 0.9 },
];

function cloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) return new CanvasTexture(canvas);
  for (let index = 0; index < 90; index += 1) {
    const x = 40 + ((index * 97) % 432);
    const y = 64 + Math.sin(index * 1.7) * 18;
    const radius = 26 + ((index * 37) % 40);
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.16)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  fadeEdges(context, canvas.width, canvas.height);
  return new CanvasTexture(canvas);
}

function fadeEdges(context: CanvasRenderingContext2D, width: number, height: number) {
  const horizontal = context.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, "rgba(0,0,0,0)");
  horizontal.addColorStop(0.25, "rgba(0,0,0,1)");
  horizontal.addColorStop(0.75, "rgba(0,0,0,1)");
  horizontal.addColorStop(1, "rgba(0,0,0,0)");
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = horizontal;
  context.fillRect(0, 0, width, height);
  const vertical = context.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(0,0,0,0)");
  vertical.addColorStop(0.3, "rgba(0,0,0,1)");
  vertical.addColorStop(0.7, "rgba(0,0,0,1)");
  vertical.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = vertical;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "source-over";
}

export function Mist({ paper, still }: { paper: Color; still: boolean }) {
  const levels = useStageLevels();
  const group = useRef<Group>(null);
  const texture = useMemo(() => cloudTexture(), []);
  const materials = useMemo(
    () => banks.map(() => new MeshBasicMaterial({ map: texture, color: paper, transparent: true, depthWrite: false, fog: false, opacity: 0 })),
    [texture, paper],
  );

  useFrame(({ camera, clock }) => {
    if (!group.current) return;
    group.current.children.forEach((child, index) => {
      const bank = banks[index];
      const mesh = child as Mesh;
      mesh.quaternion.copy(camera.quaternion);
      const drift = still ? 0 : Math.sin(clock.elapsedTime * 0.05 * bank.drift + index) * 6;
      mesh.position.set(bank.position[0] + drift, bank.position[1], bank.position[2]);
      materials[index].opacity = bank.opacity * levels.mist;
      materials[index].visible = levels.mist > 0.01;
    });
  });

  return (
    <group ref={group}>
      {banks.map((bank, index) => (
        <mesh key={index} position={bank.position} material={materials[index]} renderOrder={2}>
          <planeGeometry args={[bank.width, bank.height]} />
        </mesh>
      ))}
    </group>
  );
}
