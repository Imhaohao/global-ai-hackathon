"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, SRGBColorSpace, type Object3D, type Texture } from "three";
import { useStageLevels } from "./stageLevels";
import type { FeatureScreen } from "./shots";

export const STAGE_MODEL_URL = "/stage/coffee-slope.glb";

const screenTextureUrls = {
  idle: "/stage/screens/feature-idle.png",
  sent: "/stage/screens/feature-sent.png",
  reply: "/stage/screens/feature-reply.png",
  hub: "/stage/screens/hub-exchange.png",
  officer: "/stage/screens/officer-case.png",
};

const RUST_MATERIAL_NAMES = new Set(["RustLeafHero", "RustLeaf"]);
const SHADOWLESS = new Set(["Terrain", "DistantHills_0", "DistantHills_1", "DistantHills_2"]);

type ScreenMaterials = { feature: MeshBasicMaterial; hub: MeshBasicMaterial; officer: MeshBasicMaterial };

function prepareTextures(textures: Record<keyof typeof screenTextureUrls, Texture>) {
  for (const texture of Object.values(textures)) {
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
  }
}

function standardMaterials(mesh: Mesh): MeshStandardMaterial[] {
  const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return list.filter((material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial);
}

function prepareMesh(mesh: Mesh, rustMaterials: Set<MeshStandardMaterial>) {
  mesh.castShadow = !SHADOWLESS.has(mesh.name);
  mesh.receiveShadow = true;
  for (const material of standardMaterials(mesh)) {
    if (material.alphaTest > 0) material.side = DoubleSide;
    if (RUST_MATERIAL_NAMES.has(material.name)) rustMaterials.add(material);
    material.envMapIntensity = 0.8;
  }
}

function collect(scene: Object3D) {
  const rustMaterials = new Set<MeshStandardMaterial>();
  const screens: Partial<Record<keyof ScreenMaterials, Mesh>> = {};
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    prepareMesh(object, rustMaterials);
    if (object.name === "FeaturePhoneScreen") screens.feature = object;
    if (object.name === "HubPhoneScreen") screens.hub = object;
    if (object.name === "OfficerPhoneScreen") screens.officer = object;
  });
  return { rustMaterials: [...rustMaterials], screens };
}

function dressScreens(screens: Partial<Record<keyof ScreenMaterials, Mesh>>, materials: ScreenMaterials) {
  for (const key of Object.keys(materials) as (keyof ScreenMaterials)[]) {
    const mesh = screens[key];
    if (mesh) mesh.material = materials[key];
  }
}

function showTexture(material: MeshBasicMaterial, texture: Texture) {
  material.map = texture;
  material.needsUpdate = true;
}

function glow(materials: MeshStandardMaterial[], intensity: number) {
  for (const material of materials) material.emissiveIntensity = intensity;
}

function useScreenMaterials(textures: Record<keyof typeof screenTextureUrls, Texture>) {
  return useMemo<ScreenMaterials>(
    () => ({
      feature: new MeshBasicMaterial({ map: textures.idle, toneMapped: false }),
      hub: new MeshBasicMaterial({ map: textures.hub, toneMapped: false }),
      officer: new MeshBasicMaterial({ map: textures.officer, toneMapped: false }),
    }),
    [textures],
  );
}

export function SlopeModel({ featureScreen }: { featureScreen: FeatureScreen }) {
  const { scene } = useGLTF(STAGE_MODEL_URL);
  const textures = useTexture(screenTextureUrls);
  const levels = useStageLevels();
  const { rustMaterials, screens } = useMemo(() => collect(scene), [scene]);
  const screenMaterials = useScreenMaterials(textures);

  useEffect(() => prepareTextures(textures), [textures]);

  useEffect(() => dressScreens(screens, screenMaterials), [screens, screenMaterials]);
  useEffect(() => showTexture(screenMaterials.feature, textures[featureScreen]), [featureScreen, screenMaterials, textures]);

  useFrame(({ clock }) => {
    const pulse = 0.82 + 0.18 * Math.sin(clock.elapsedTime * 2.1);
    glow(rustMaterials, 0.25 + levels.rustGlow * 2.6 * pulse);
  });

  return <primitive object={scene} />;
}

useGLTF.preload(STAGE_MODEL_URL);
