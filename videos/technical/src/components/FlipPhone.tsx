import { BatteryHigh, CellSignalHigh, PhoneCall, PhoneDisconnect } from "@phosphor-icons/react";
import type { ReactNode } from "react";

/** Geometry of the basic phone in its own pixels, so a camera can aim at a named part. */
export const FLIP = { width: 360, height: 800 };
export const FLIP_PARTS = {
  earpiece: { x: 180, y: 42 },
  lcd: { x: 180, y: 200 },
  signal: { x: 72, y: 104 },
  keypad: { x: 180, y: 640 },
};

const KEYS = [
  ["1", ""],
  ["2", "abc"],
  ["3", "def"],
  ["4", "ghi"],
  ["5", "jkl"],
  ["6", "mno"],
  ["7", "pqrs"],
  ["8", "tuv"],
  ["9", "wxyz"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
] as const;

/** Which key types each letter, so the keypad lights the key a farmer would press. */
export function keyForLetter(letter: string): number {
  const index = KEYS.findIndex(([, letters]) => letters.includes(letter.toLowerCase()));
  return index < 0 ? 10 : index;
}

type FlipPhoneProps = { screen: ReactNode; litKey?: number; screenGlow?: number; legends?: number };

/** Printed digits and letters show only on the key being pressed, unless `legends` fades them all in. */
function Keypad({ litKey, legends }: { litKey?: number; legends: number }) {
  return (
    <div className="absolute left-[34px] top-[500px] grid w-[292px] grid-cols-3 gap-x-[14px] gap-y-[12px]">
      {KEYS.map(([digit, letters], index) => {
        const lit = index === litKey;
        return (
          <div
            key={digit}
            className="flex h-[58px] flex-col items-center justify-center rounded-[22px]"
            style={{
              background: lit ? "var(--color-live)" : "linear-gradient(180deg, var(--color-handset-key-top), var(--color-handset-key))",
              boxShadow: lit ? "0 0 24px var(--color-live)" : "inset 0 1px 0 rgb(255 255 255 / 0.12), 0 3px 0 var(--color-handset-key-edge)",
              translate: lit ? "0 2px" : "0 0",
            }}
          >
            <span className={`font-display text-key font-bold ${lit ? "text-night" : "text-text"}`} style={{ opacity: lit ? 1 : legends }}>
              {digit}
            </span>
            <span className={`font-body text-key-letters ${lit ? "text-night" : "text-text-faint"}`} style={{ opacity: lit ? 1 : legends }}>
              {letters}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NavCluster() {
  return (
    <div className="absolute left-[34px] top-[376px] flex h-[104px] w-[292px] items-center justify-between">
      <div className="flex h-[52px] w-[70px] items-center justify-center rounded-[20px] bg-handset-key text-live" style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.1)" }}>
        <PhoneCall size={28} weight="fill" />
      </div>
      <div className="relative size-[104px] rounded-full bg-handset-key" style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), 0 4px 0 var(--color-handset-key-edge)" }}>
        <div className="absolute left-1/2 top-1/2 size-[44px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-handset-key-top" />
      </div>
      <div className="flex h-[52px] w-[70px] items-center justify-center rounded-[20px] bg-handset-key text-end-key" style={{ boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.1)" }}>
        <PhoneDisconnect size={28} weight="fill" />
      </div>
    </div>
  );
}

/** Noor's basic phone, drawn to scale: earpiece and lens, a small LCD with signal bars, call keys and a 12-key pad. */
export function FlipPhone({ screen, litKey, screenGlow = 0.6, legends = 0 }: FlipPhoneProps) {
  return (
    <div className="relative" style={{ width: FLIP.width, height: FLIP.height }}>
      <div
        className="absolute inset-0 rounded-[64px]"
        style={{
          background: "linear-gradient(160deg, var(--color-handset-high) 0%, var(--color-handset) 38%, var(--color-handset-low) 100%)",
          boxShadow: "inset 0 2px 0 rgb(255 255 255 / 0.14), inset 0 -3px 0 rgb(0 0 0 / 0.5), 0 50px 90px rgb(0 0 0 / 0.6)",
        }}
      />
      <div className="absolute left-[140px] top-[36px] h-[12px] w-[80px] rounded-full bg-handset-slot" style={{ boxShadow: "inset 0 2px 3px rgb(0 0 0 / 0.8)" }} />
      <div className="absolute left-[252px] top-[30px] size-[24px] rounded-full" style={{ background: "radial-gradient(circle at 35% 35%, #4b5a6a 0 18%, #10141a 45%, #050607 70%)", boxShadow: "0 0 0 3px var(--color-handset)" }} />
      <div className="absolute left-[34px] top-[78px] h-[270px] w-[292px] rounded-[18px] bg-handset-slot p-[10px]">
        <div
          className="relative size-full overflow-hidden rounded-[10px] bg-lcd"
          style={{ boxShadow: `inset 0 0 18px rgb(0 0 0 / 0.35), 0 0 ${60 * screenGlow}px color-mix(in srgb, var(--color-lcd) ${40 * screenGlow}%, transparent)` }}
        >
          <div className="absolute inset-x-[14px] top-[10px] flex items-center justify-between text-lcd-ink">
            <CellSignalHigh size={30} weight="fill" />
            <BatteryHigh size={30} weight="fill" />
          </div>
          <div className="absolute inset-x-[14px] bottom-[14px] top-[50px]">{screen}</div>
        </div>
      </div>
      <NavCluster />
      <Keypad litKey={litKey} legends={legends} />
    </div>
  );
}
