import type { ReactNode } from "react";

const KEYS = [
  ["1", ""], ["2", "abc"], ["3", "def"],
  ["4", "ghi"], ["5", "jkl"], ["6", "mno"],
  ["7", "pqrs"], ["8", "tuv"], ["9", "wxyz"],
  ["*", "+"], ["0", "_"], ["#", ""],
] as const;

export const FEATURE_PHONE = { width: 440, height: 960, screen: { x: 52, y: 92, width: 336, height: 300 } } as const;

function Key({ digit, letters, pressed }: { digit: string; letters: string; pressed: boolean }) {
  return (
    <div
      className="flex h-[78px] flex-col items-center justify-center rounded-md"
      style={{
        background: pressed ? "#3b3a34" : "linear-gradient(#2c2b27, #22211d)",
        boxShadow: pressed ? "inset 0 3px 6px rgba(0,0,0,0.6)" : "0 3px 0 #121210, inset 0 1px 0 rgba(255,255,255,0.08)",
        translate: pressed ? "0 3px" : "0 0",
      }}
    >
      <span className="font-display text-key font-bold text-paper-raised/90">{digit}</span>
      <span className="text-key-letters text-paper-raised/45">{letters}</span>
    </div>
  );
}

/** A generic basic keypad phone, drawn rather than photographed so the screen can carry real SMS text. */
export function FeaturePhone({ children, pressedKey, glow = 0 }: { children?: ReactNode; pressedKey?: string; glow?: number }) {
  const { width, height, screen } = FEATURE_PHONE;
  return (
    <div
      className="relative"
      style={{
        width,
        height,
        borderRadius: 64,
        background: "linear-gradient(160deg, #3a3934 0%, #1d1c19 45%, #121210 100%)",
        boxShadow: "0 40px 90px rgba(16,18,14,0.55), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -4px 10px rgba(0,0,0,0.6)",
      }}
    >
      <div className="absolute left-1/2 top-[40px] h-[10px] w-[84px] -translate-x-1/2 rounded-full bg-black/70" />
      <div
        className="absolute overflow-hidden rounded-sm bg-lcd text-lcd-ink"
        style={{
          left: screen.x,
          top: screen.y,
          width: screen.width,
          height: screen.height,
          boxShadow: `inset 0 3px 10px rgba(0,0,0,0.35), 0 0 ${40 * glow}px ${10 * glow}px color-mix(in srgb, var(--brand-lcd) 55%, transparent)`,
        }}
      >
        {children}
      </div>
      <div className="absolute inset-x-[52px] top-[424px] flex h-[86px] items-center justify-between">
        <div className="h-[44px] w-[86px] rounded-md bg-[#2a2925] shadow-[0_3px_0_#121210]" />
        <div className="size-[86px] rounded-full bg-[#2a2925] shadow-[0_3px_0_#121210,inset_0_0_0_22px_#1d1c19]" />
        <div className="h-[44px] w-[86px] rounded-md bg-[#2a2925] shadow-[0_3px_0_#121210]" />
      </div>
      <div className="absolute inset-x-[44px] top-[536px] grid grid-cols-3 gap-x-[14px] gap-y-[16px]">
        {KEYS.map(([digit, letters]) => (
          <Key key={digit} digit={digit} letters={letters} pressed={pressedKey === digit} />
        ))}
      </div>
    </div>
  );
}

/** The status row at the top of the basic phone's screen. */
export function LcdStatus({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-2 text-sms-status font-bold">
      <span className="flex items-end gap-[3px]" aria-hidden>
        {[8, 12, 16, 20].map((bar) => (
          <span key={bar} className="w-[5px] bg-lcd-ink" style={{ height: bar }} />
        ))}
      </span>
      <span>{label}</span>
      <span className="h-[14px] w-[30px] bg-lcd-ink/80" aria-hidden />
    </div>
  );
}
