import { Airplane, Bluetooth, Broadcast, CellSignalFull, LinkSimple, Moon, Play, Rewind, FastForward, Screencast, Lock, Flashlight, Timer, Calculator, Camera as CameraIcon, WifiHigh, Plus, Power } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Phone } from "../components/Phone";
import { Place } from "../components/Stage";
import { focus } from "../lib/focus";
import { glide, leave, progress, settle } from "../lib/ease";
import { PHONE_SCREEN_HEIGHT } from "../lib/focus";

export { AIRPLANE } from "../app/shots";
import { AIRPLANE } from "../app/shots";

const TOGGLE = { airplane: { x: 80, y: 211 }, airdrop: { x: 151, y: 211 }, wifi: { x: 80, y: 283 } } as const;
const PHONE_AT = { x: -260, y: 0 };

/** A Control Center module: frosted glass with the iOS 26 rim light. */
function Module({ x, y, width, height, radius = 30, children }: { x: number; y: number; width: number; height: number; radius?: number; children?: ReactNode }) {
  return (
    <div
      className="absolute"
      style={{ left: x, top: y, width, height, borderRadius: radius, background: "rgba(120,130,125,0.32)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.12)" }}
    >
      {children}
    </div>
  );
}

function Round({ x, y, r, fill, children, style }: { x: number; y: number; r: number; fill: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="absolute flex items-center justify-center rounded-full" style={{ left: x - r, top: y - r, width: r * 2, height: r * 2, background: fill, ...style }}>
      {children}
    </div>
  );
}

/** The connectivity module, faithful to the iOS 26 layout in ScreenRecording 22-33-02: airplane, AirDrop, Wi-Fi, cellular. */
function Connectivity({ press, wifiOff, cellOff }: { press: number; wifiOff: number; cellOff: number }) {
  const frame = useCurrentFrame();
  const squash = 1 - 0.1 * Math.sin(Math.PI * Math.min(Math.max((frame - press + 4) / 8, 0), 1));
  const on = progress(frame, press, 6, settle);
  const wifi = progress(frame, wifiOff, 6, settle);
  const cell = progress(frame, cellOff, 6, settle);
  const bloom = on * (1 - 0.6 * progress(frame, press + 6, 30));
  return (
    <>
      <Module x={38} y={170} width={155} height={155} radius={42} />
      <Round x={TOGGLE.airplane.x} y={TOGGLE.airplane.y} r={28} fill={on > 0.5 ? "#ff8a2a" : "rgba(255,255,255,0.18)"} style={{ scale: squash, boxShadow: `0 0 ${30 * bloom}px ${10 * bloom}px rgba(255,140,40,${0.8 * bloom})` }}>
        <Airplane size={30} weight="fill" color="#ffffff" />
      </Round>
      <Round x={TOGGLE.airdrop.x} y={TOGGLE.airdrop.y} r={28} fill="#1f84ff">
        <Broadcast size={28} weight="bold" color="#ffffff" />
      </Round>
      <Round x={TOGGLE.wifi.x} y={TOGGLE.wifi.y} r={28} fill={interpolate(wifi, [0, 1], [1, 0]) > 0.5 ? "#ffffff" : "rgba(255,255,255,0.18)"} style={{ scale: 1 - 0.08 * Math.sin(Math.PI * wifi) }}>
        <WifiHigh size={30} weight="bold" color={wifi < 0.5 ? "#111111" : "rgba(255,255,255,0.7)"} />
      </Round>
      <Round x={135} y={267} r={13} fill={cell < 0.5 ? "#36c759" : "rgba(255,255,255,0.18)"}>
        <CellSignalFull size={14} weight="fill" color="#ffffff" />
      </Round>
      <Round x={167} y={267} r={13} fill="#1f84ff">
        <Bluetooth size={14} weight="bold" color="#ffffff" />
      </Round>
      <Round x={135} y={299} r={13} fill="rgba(255,255,255,0.18)">
        <LinkSimple size={14} weight="bold" color="#ffffff" />
      </Round>
      <Round x={167} y={299} r={13} fill="rgba(255,255,255,0.18)" />
    </>
  );
}

/** The rest of Control Center: media, rotation lock, mirroring, sliders, focus and the bottom row. */
function OtherModules() {
  return (
    <>
      <Module x={209} y={170} width={155} height={155} radius={42}>
        <div className="absolute left-[14px] top-[14px] size-[52px] rounded-[14px]" style={{ background: "rgba(255,255,255,0.12)" }} />
        <div className="ios-text absolute left-[16px] top-[86px] text-[15px] font-semibold text-white">Not Playing</div>
        <div className="absolute bottom-[16px] left-[20px] right-[20px] flex items-center justify-between text-white">
          <Rewind size={20} weight="fill" />
          <Play size={26} weight="fill" />
          <FastForward size={20} weight="fill" />
        </div>
      </Module>
      <Round x={73} y={375} r={35} fill="rgba(255,255,255,0.9)">
        <Lock size={28} weight="bold" color="#ff3b30" />
      </Round>
      <Round x={158} y={375} r={35} fill="rgba(120,130,125,0.32)">
        <Screencast size={28} weight="bold" color="#ffffff" />
      </Round>
      <Module x={209} y={340} width={69} height={155} radius={34}>
        <div className="absolute inset-x-0 bottom-0 h-[50px] rounded-b-[34px] bg-white/90" />
      </Module>
      <Module x={294} y={340} width={69} height={155} radius={34}>
        <div className="absolute inset-x-0 bottom-0 h-[78px] rounded-b-[34px] bg-white/90" />
      </Module>
      <Module x={38} y={426} width={155} height={64} radius={32}>
        <Round x={32} y={32} r={22} fill="#ffffff">
          <Moon size={22} weight="fill" color="#5e5ce6" />
        </Round>
      </Module>
      {[Flashlight, Timer, Calculator, CameraIcon].map((Icon, index) => (
        <Round key={index} x={73 + index * 85} y={548} r={35} fill="rgba(120,130,125,0.32)">
          <Icon size={28} weight="bold" color="#ffffff" />
        </Round>
      ))}
      <div className="absolute left-[34px] top-[26px] text-white">
        <Plus size={22} weight="bold" />
      </div>
      <div className="absolute right-[34px] top-[26px] text-white">
        <Power size={22} weight="bold" />
      </div>
    </>
  );
}

/** Control Center's status row: Wi-Fi bars drain away, then the airplane icon takes their place. */
function StatusRow({ press, wifiOff }: { press: number; wifiOff: number }) {
  const frame = useCurrentFrame();
  const drain = progress(frame, press, wifiOff - press + 6, glide);
  const plane = progress(frame, wifiOff + 2, 8, settle);
  return (
    <div className="ios-text absolute left-[40px] right-[40px] top-[110px] flex items-center justify-between text-white">
      <div className="relative h-[24px] w-[60px]">
        <div className="absolute inset-0 flex items-center gap-[6px]" style={{ opacity: 1 - plane }}>
          <CellSignalFull size={20} weight="fill" style={{ opacity: 1 - drain }} />
          <WifiHigh size={20} weight="bold" style={{ clipPath: `inset(${drain * 100}% 0 0 0)` }} />
        </div>
        <div className="absolute inset-0 flex items-center" style={{ opacity: plane, scale: 0.6 + 0.4 * plane }}>
          <Airplane size={22} weight="fill" />
        </div>
      </div>
      <div className="text-[17px] font-semibold">34%</div>
    </div>
  );
}

/** A finger swiping down from the top-right corner, the gesture that opens Control Center. */
function Swipe({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const move = progress(frame, at, 12, glide);
  const shown = Math.min(progress(frame, at - 3, 3), 1 - progress(frame, at + 12, 5, leave));
  return <div className="absolute rounded-full" style={{ left: 330, top: 10 + move * 230, width: 46, height: 46, background: "rgba(255,255,255,0.55)", boxShadow: "0 0 24px rgba(0,0,0,0.3)", opacity: shown }} />;
}

/** The press: a light flare across the toggle as airplane mode turns on. */
function Flare({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const burst = progress(frame, at, 5, settle) * (1 - progress(frame, at + 5, 22));
  return (
    <div className="pointer-events-none absolute" style={{ left: TOGGLE.airplane.x - 160, top: TOGGLE.airplane.y - 8, width: 320, height: 16, opacity: burst, background: "radial-gradient(ellipse at center, rgba(255,230,190,0.95) 0%, rgba(255,150,60,0.5) 30%, transparent 70%)", mixBlendMode: "screen", scale: `${0.4 + burst} 1` }} />
  );
}

/** The phone's screen: Leaf Doctor's home, then Control Center dropping over it with depth and blur. */
function Screen() {
  const frame = useCurrentFrame();
  const drop = progress(frame, AIRPLANE.swipe + 4, 16, settle);
  return (
    <>
      <Img src={staticFile("images/app-home.png")} className="absolute inset-0 size-full" style={{ filter: `blur(${drop * 14}px)`, scale: 1 + 0.04 * drop }} />
      <div className="absolute inset-0" style={{ background: `rgba(30,34,32,${0.55 * drop})` }} />
      <div className="absolute inset-0" style={{ opacity: drop, translate: `0 ${(1 - drop) * -260}px`, scale: 1.06 - 0.06 * drop }}>
        <StatusRow press={AIRPLANE.press} wifiOff={AIRPLANE.wifiOff} />
        <OtherModules />
        <Connectivity press={AIRPLANE.press} wifiOff={AIRPLANE.wifiOff} cellOff={AIRPLANE.cellOff} />
        <Flare at={AIRPLANE.press} />
      </div>
      <Swipe at={AIRPLANE.swipe} />
    </>
  );
}

const CAMERA = [
  focus(AIRPLANE.in, { x: 201, y: 437 }, 0.95, PHONE_AT, PHONE_AT),
  focus(AIRPLANE.swipe + 14, { x: 201, y: 437 }, 1.0, PHONE_AT, PHONE_AT),
  focus(AIRPLANE.press - 2, { x: 110, y: 240 }, 2.5, PHONE_AT, { x: -430, y: 0 }),
  focus(AIRPLANE.press + 4, { x: 110, y: 240 }, 2.62, PHONE_AT, { x: -430, y: 0 }),
  focus(AIRPLANE.cellOff + 10, { x: 115, y: 250 }, 2.35, PHONE_AT, { x: -430, y: 0 }),
];

/** Turning on airplane mode, cinematically: dark frame, rack focus, Control Center drops, the toggle lights up. */
export function AirplaneMode() {
  const frame = useCurrentFrame();
  if (frame < AIRPLANE.in - 2 || frame > AIRPLANE.out + 2) return null;
  const shown = progress(frame, AIRPLANE.in, 10, settle) * (1 - progress(frame, AIRPLANE.out - 6, 6, leave));
  const rack = 1 - progress(frame, AIRPLANE.in, 18, settle);
  const glow = progress(frame, AIRPLANE.press, 6) * (1 - 0.5 * progress(frame, AIRPLANE.press + 6, 40));
  return (
    <AbsoluteFill className="bg-black" style={{ opacity: shown }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 35% 45%, rgba(255,120,30,${0.22 * glow}) 0%, rgba(13,15,11,0) 55%), radial-gradient(ellipse at 40% 55%, rgba(40,48,42,0.6) 0%, #000 70%)` }} />
      <AbsoluteFill style={{ filter: `blur(${rack * 12}px)` }}>
        <Camera keys={CAMERA}>
          <Place x={PHONE_AT.x}>
            <Phone screenHeight={PHONE_SCREEN_HEIGHT} dark>
              <Screen />
            </Phone>
          </Place>
        </Camera>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
