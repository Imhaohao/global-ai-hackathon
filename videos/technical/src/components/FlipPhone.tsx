import { BatteryHigh, CellSignalHigh, PhoneCall, PhoneDisconnect } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { KEYS } from "../lib/keypad";

/** Geometry of the basic phone in its own pixels, so a camera can aim at a named part. */
export const FLIP = { width: 360, height: 800 };
export const FLIP_PARTS = {
  earpiece: { x: 180, y: 42 },
  lcd: { x: 180, y: 200 },
  signal: { x: 72, y: 104 },
  keypad: { x: 180, y: 640 },
};

/** Which key types each letter, so the keypad lights the key a farmer would press. */
export function keyForLetter(letter: string): number {
  const index = KEYS.findIndex(([, letters]) => letters.includes(letter.toLowerCase()));
  return index < 0 ? 10 : index;
}

const BEVEL = "inset 0 1.5px 0 rgb(255 255 255 / 0.16), inset 0 -2px 0 rgb(0 0 0 / 0.45)";

function Key({ digit, letters, lit }: { digit: string; letters: string; lit: boolean }) {
  return (
    <div
      data-box="key"
      className="flex h-[58px] items-center justify-center gap-[6px] rounded-[22px]"
      style={{
        background: lit ? "var(--color-live)" : "linear-gradient(180deg, var(--color-handset-key-top), var(--color-handset-key))",
        boxShadow: lit ? `0 0 26px var(--color-live), ${BEVEL}` : `${BEVEL}, 0 3px 0 var(--color-handset-key-edge), 0 5px 8px rgb(0 0 0 / 0.4)`,
        translate: lit ? "0 2px" : "0 0",
      }}
    >
      <span className={`font-display text-key font-bold ${lit ? "text-night" : "text-text"}`}>{digit}</span>
      <span className={`font-display text-key-letters ${lit ? "text-night" : "text-text-muted"}`}>{letters}</span>
    </div>
  );
}

function Keypad({ litKey }: { litKey?: number }) {
  return (
    <div className="absolute left-[30px] top-[500px] grid w-[300px] grid-cols-3 gap-x-[12px] gap-y-[12px]">
      {KEYS.map(([digit, letters], index) => (
        <Key key={digit} digit={digit} letters={letters} lit={index === litKey} />
      ))}
    </div>
  );
}

function NavCluster() {
  const softKey = "h-[18px] w-[70px] rounded-full bg-handset-key";
  return (
    <div className="absolute left-[30px] top-[368px] h-[118px] w-[300px]">
      <div className={`absolute left-0 top-0 ${softKey}`} style={{ boxShadow: BEVEL }} />
      <div className={`absolute right-0 top-0 ${softKey}`} style={{ boxShadow: BEVEL }} />
      <div className="absolute bottom-[6px] left-0 flex h-[52px] w-[74px] items-center justify-center rounded-[20px] bg-handset-key text-live" style={{ boxShadow: BEVEL }}>
        <PhoneCall size={28} weight="fill" />
      </div>
      <div className="absolute left-1/2 top-[8px] size-[108px] -translate-x-1/2 rounded-full" style={{ background: "radial-gradient(circle at 50% 35%, var(--color-handset-key-top), var(--color-handset-key))", boxShadow: `${BEVEL}, 0 4px 0 var(--color-handset-key-edge)` }}>
        <div className="absolute left-1/2 top-1/2 size-[46px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-handset-key" style={{ boxShadow: "inset 0 2px 4px rgb(0 0 0 / 0.5)" }} />
      </div>
      <div className="absolute bottom-[6px] right-0 flex h-[52px] w-[74px] items-center justify-center rounded-[20px] bg-handset-key text-end-key" style={{ boxShadow: BEVEL }}>
        <PhoneDisconnect size={28} weight="fill" />
      </div>
    </div>
  );
}

function Lcd({ screen, glow }: { screen: ReactNode; glow: number }) {
  return (
    <div className="absolute left-[30px] top-[76px] h-[276px] w-[300px] rounded-[20px] bg-handset-slot p-[12px]" style={{ boxShadow: "inset 0 3px 8px rgb(0 0 0 / 0.8), 0 1px 0 rgb(255 255 255 / 0.08)" }}>
      <div
        className="relative size-full overflow-hidden rounded-[8px]"
        style={{
          background: "radial-gradient(120% 90% at 50% 40%, var(--color-lcd-backlight), var(--color-lcd) 60%, var(--color-lcd-shade))",
          boxShadow: `inset 0 0 22px rgb(0 0 0 / 0.35), 0 0 ${70 * glow}px color-mix(in srgb, var(--color-lcd-backlight) ${45 * glow}%, transparent)`,
        }}
      >
        <div className="absolute inset-x-[12px] top-[8px] flex items-center justify-between text-lcd-ink">
          <CellSignalHigh size={30} weight="fill" />
          <BatteryHigh size={30} weight="fill" />
        </div>
        <div data-box="lcd" className="absolute inset-x-[14px] bottom-[14px] top-[48px]">{screen}</div>
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, rgb(0 0 0 / 0.07) 0 1px, transparent 1px 3px)" }} />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(160deg, rgb(255 255 255 / 0.22), transparent 38%)" }} />
      </div>
    </div>
  );
}

type FlipPhoneProps = { screen: ReactNode; litKey?: number; screenGlow?: number };

/** Noor's basic phone, drawn to scale: bevelled shell, earpiece and lens, a backlit pixel LCD, call keys and a 12-key pad. */
export function FlipPhone({ screen, litKey, screenGlow = 0.6 }: FlipPhoneProps) {
  return (
    <div className="relative" style={{ width: FLIP.width, height: FLIP.height }}>
      <div className="absolute -left-[6px] top-[150px] h-[90px] w-[8px] rounded-l-md bg-handset-low" />
      <div
        className="absolute inset-0 rounded-[64px]"
        style={{
          background: "linear-gradient(160deg, var(--color-handset-high) 0%, var(--color-handset) 38%, var(--color-handset-low) 100%)",
          boxShadow: "inset 0 2px 0 rgb(255 255 255 / 0.18), inset 2px 0 0 rgb(255 255 255 / 0.06), inset 0 -4px 0 rgb(0 0 0 / 0.55), inset -2px 0 0 rgb(0 0 0 / 0.35), 0 50px 90px rgb(0 0 0 / 0.6)",
        }}
      />
      <div className="absolute inset-[10px] rounded-[56px]" style={{ boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.05)" }} />
      <div className="absolute left-[140px] top-[34px] h-[12px] w-[80px] rounded-full bg-handset-slot" style={{ backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.12) 1px, transparent 1.5px)", backgroundSize: "6px 6px", boxShadow: "inset 0 2px 3px rgb(0 0 0 / 0.8)" }} />
      <div className="absolute left-[252px] top-[28px] size-[24px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #4b5a6a 0 18%, #10141a 45%, #050607 70%)", boxShadow: "0 0 0 3px var(--color-handset-key)" }} />
      <Lcd screen={screen} glow={screenGlow} />
      <NavCluster />
      <Keypad litKey={litKey} />
      <div className="absolute bottom-[14px] left-1/2 flex -translate-x-1/2 gap-[6px]">
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} className="size-[5px] rounded-full bg-handset-slot" />
        ))}
      </div>
    </div>
  );
}
