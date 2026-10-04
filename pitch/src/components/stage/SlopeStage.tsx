"use client";

import { Environment } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DirectionalLight, Fog, NoToneMapping, Object3D, PerspectiveCamera, Vector3, type Scene, type WebGLRenderer } from "three";
import { readThemeColors, type ThemeColors } from "@/lib/themeColors";
import { CasePins } from "./CasePins";
import { Mist } from "./Mist";
import { RustBeacon } from "./RustBeacon";
import { ScanRings } from "./ScanRings";
import { shots, type ShotName } from "./shots";
import { SlopeModel } from "./SlopeModel";
import { StageLevelsProvider, useStageLevels } from "./stageLevels";

const SUN_DIRECTION = new Vector3(-0.55, 0.62, 0.56).normalize();

type Framing = { base: Vector3; target: Vector3; reach: number; shift: number; drop: number; width: number; height: number };

function placeCamera(camera: PerspectiveCamera, framing: Framing, seconds: number) {
  const { base, target, reach } = framing;
  camera.position.set(base.x + Math.sin(seconds * 0.13) * reach * 2, base.y + Math.sin(seconds * 0.21) * reach, base.z + Math.cos(seconds * 0.11) * reach);
  camera.lookAt(target);
  camera.near = Math.max(0.01, base.distanceTo(target) * 0.05);
  camera.setViewOffset(framing.width, framing.height, -framing.shift * framing.width, -framing.drop * framing.height, framing.width, framing.height);
  camera.updateProjectionMatrix();
}

type Flight = {
  shot: ShotName;
  start: number;
  duration: number;
  fromPosition: Vector3;
  fromTarget: Vector3;
  fromFov: number;
  arc: number;
};

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function flightSeconds(from: Vector3, to: Vector3, still: boolean) {
  if (still) return 0;
  const distance = from.distanceTo(to);
  return Math.min(3.4, 1.5 + Math.log2(1 + distance / 2) * 0.42);
}

function beginFlight(flight: Flight, shot: ShotName, now: number, current: { base: Vector3; target: Vector3; fov: number }, still: boolean) {
  flight.shot = shot;
  flight.start = now;
  flight.fromPosition.copy(current.base);
  flight.fromTarget.copy(current.target);
  flight.fromFov = current.fov;
  const destination = new Vector3(...shots[shot].cameraPosition);
  flight.duration = flightSeconds(current.base, destination, still);
  flight.arc = Math.min(6, Math.max(0.15, current.base.distanceTo(destination) * 0.22));
}

function fly(flight: Flight, now: number, base: Vector3, target: Vector3, camera: PerspectiveCamera) {
  const framing = shots[flight.shot];
  const progress = flight.duration > 0 ? Math.min(1, (now - flight.start) / flight.duration) : 1;
  const eased = easeInOutCubic(progress);
  const look = easeInOutCubic(Math.min(1, progress * 1.15));
  base.lerpVectors(flight.fromPosition, new Vector3(...framing.cameraPosition), eased);
  base.y += Math.sin(Math.PI * eased) * flight.arc;
  target.lerpVectors(flight.fromTarget, new Vector3(...framing.cameraTarget), look);
  camera.fov = flight.fromFov + (framing.fov - flight.fromFov) * eased;
}

function CameraRig({ shot, still }: { shot: ShotName; still: boolean }) {
  const levels = useStageLevels();
  const { camera, size } = useThree();
  const [target] = useState(() => new Vector3(...shots[shot].cameraTarget));
  const [base] = useState(() => new Vector3(...shots[shot].cameraPosition));
  const [flight] = useState<Flight>(() => ({ shot, start: 0, duration: 0, fromPosition: base.clone(), fromTarget: target.clone(), fromFov: shots[shot].fov, arc: 0 }));

  useFrame(({ clock }) => {
    const now = clock.elapsedTime;
    const perspective = camera as PerspectiveCamera;
    if (flight.shot !== shot) beginFlight(flight, shot, now, { base, target, fov: perspective.fov }, still);
    fly(flight, now, base, target, perspective);
    const reach = base.distanceTo(target) * 0.012 * levels.sway * (still ? 0 : 1);
    placeCamera(perspective, { base, target, reach, shift: levels.frameShift, drop: levels.frameDrop, width: size.width, height: size.height }, now);
  });

  return null;
}

function SunFollowingShot({ shot }: { shot: ShotName }) {
  const light = useRef<DirectionalLight>(null);
  const [focus] = useState(() => new Vector3(...shots[shot].cameraTarget));
  const [span] = useState(() => ({ value: 20 }));
  const lightTarget = useMemo(() => new Object3D(), []);

  useFrame((_, delta) => {
    const sun = light.current;
    if (!sun) return;
    const framing = shots[shot];
    easing.damp3(focus, framing.cameraTarget, 0.8, Math.min(delta, 1 / 20));
    const distance = new Vector3(...framing.cameraPosition).distanceTo(new Vector3(...framing.cameraTarget));
    easing.damp(span, "value", Math.min(70, Math.max(1.2, distance * 0.9)), 0.8, Math.min(delta, 1 / 20));
    lightTarget.position.copy(focus);
    sun.position.copy(focus).addScaledVector(SUN_DIRECTION, Math.max(20, span.value * 2));
    const shadowCamera = sun.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -span.value;
    shadowCamera.right = shadowCamera.top = span.value;
    shadowCamera.near = 0.5;
    shadowCamera.far = Math.max(60, span.value * 5);
    shadowCamera.updateProjectionMatrix();
    sun.shadow.bias = -0.0002 * Math.max(1, span.value / 10);
  });

  return (
    <>
      <primitive object={lightTarget} />
      <directionalLight ref={light} target={lightTarget} color="#ffe2bd" intensity={3.1} castShadow shadow-mapSize={[4096, 4096]} shadow-normalBias={0.02} />
      <hemisphereLight args={["#e9eef2", "#6b4a32", 0.35]} />
    </>
  );
}

function attachFog(scene: Scene, fog: Fog | null) {
  scene.fog = fog;
}

function SceneFog({ shot, colors }: { shot: ShotName; colors: ThemeColors }) {
  const scene = useThree((state) => state.scene);
  const [fog] = useState(() => new Fog(colors.paper, shots[shot].fogNear, shots[shot].fogFar));
  useEffect(() => {
    attachFog(scene, fog);
    return () => attachFog(scene, null);
  }, [scene, fog]);
  useFrame((_, delta) => {
    const step = Math.min(delta, 1 / 20);
    easing.damp(fog, "near", shots[shot].fogNear, 1.0, step);
    easing.damp(fog, "far", shots[shot].fogFar, 1.0, step);
  });
  return null;
}

const REMOUNT_AFTER_LOSS_MS = 400;
const MAX_REMOUNTS_IN_A_ROW = 3;

function skipRenderingWhileLost(gl: WebGLRenderer) {
  const context = gl.getContext();
  const render = gl.render.bind(gl);
  gl.render = (scene, camera) => {
    if (!context.isContextLost()) render(scene, camera);
  };
}

function useRecoverFromContextLoss() {
  const [generation, setGeneration] = useState(0);
  const [lost, setLost] = useState(false);
  const failuresInARow = useRef(0);

  useEffect(() => {
    if (!lost || failuresInARow.current > MAX_REMOUNTS_IN_A_ROW) return;
    const timer = window.setTimeout(() => {
      setGeneration((current) => current + 1);
      setLost(false);
    }, REMOUNT_AFTER_LOSS_MS * 2 ** failuresInARow.current);
    return () => window.clearTimeout(timer);
  }, [lost]);

  const watch = useCallback((gl: WebGLRenderer, stopRendering: () => void) => {
    skipRenderingWhileLost(gl);
    gl.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        stopRendering();
        failuresInARow.current += 1;
        setLost(true);
      },
      { once: true },
    );
  }, []);

  return { generation, lost, watch };
}

export function SlopeStage({ shot, still, onReady }: { shot: ShotName; still: boolean; onReady?: () => void }) {
  const [colors] = useState(readThemeColors);
  const { generation, lost, watch } = useRecoverFromContextLoss();
  const framing = shots[shot];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
      {!lost && (
        <Canvas
          key={generation}
          shadows="percentage"
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping }}
          camera={{ fov: framing.fov, near: 0.05, far: 900, position: framing.cameraPosition }}
          onCreated={({ gl, setFrameloop }) => {
            gl.setClearColor(0x000000, 0);
            watch(gl, () => setFrameloop("never"));
          }}
        >
          <StageLevelsProvider shot={shot} instant={still}>
            <CameraRig shot={shot} still={still} />
            <SunFollowingShot shot={shot} />
            <SceneFog shot={shot} colors={colors} />
            <Suspense fallback={null}>
              <Environment files="/stage/morning.hdr" environmentIntensity={0.42} />
              <SlopeModel featureScreen={framing.featureScreen} />
              <ReadySignal onReady={onReady} />
            </Suspense>
            <Mist paper={colors.paper} still={still} />
            <ScanRings glow={colors.rust} />
            <RustBeacon glow={colors.rustGlow} />
            <CasePins glow={colors.rustGlow} rust={colors.rust} />
          </StageLevelsProvider>
        </Canvas>
      )}
    </div>
  );
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  useEffect(() => onReady?.(), [onReady]);
  return null;
}
