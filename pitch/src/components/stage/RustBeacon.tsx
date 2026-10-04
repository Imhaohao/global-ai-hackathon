"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { AdditiveBlending, CanvasTexture, MeshBasicMaterial, Vector3, type Color } from "three";
import { rustLeafCentres } from "./shots";
import { useStageLevels } from "./stageLevels";

function haloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.9)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
  }
  return new CanvasTexture(canvas);
}

const heroLeaf = new Vector3(...rustLeafCentres[0]);

function setGlow(material: MeshBasicMaterial, opacity: number) {
  material.opacity = opacity;
  material.visible = opacity > 0.01;
}

/** A soft pulse of light around the hero rust leaf, so the infection reads from across the slope. */
export function RustBeacon({ glow }: { glow: Color }) {
  const levels = useStageLevels();
  const material = useMemo(
    () => new MeshBasicMaterial({ map: haloTexture(), color: glow, transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending, opacity: 0 }),
    [glow],
  );

  useFrame(({ clock, camera }) => {
    const farness = Math.min(1, Math.max(0, (camera.position.distanceTo(heroLeaf) - 1.2) / 3));
    const pulse = 0.75 + 0.25 * Math.sin(clock.elapsedTime * 2.1);
    setGlow(material, levels.rustGlow * farness * pulse);
  });

  return (
    <Billboard position={rustLeafCentres[0]}>
      <mesh material={material} renderOrder={6}>
        <planeGeometry args={[1.1, 1.1]} />
      </mesh>
    </Billboard>
  );
}
