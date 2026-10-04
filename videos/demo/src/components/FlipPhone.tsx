import { Phone, PhoneDisconnect } from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";
import { BODY, EARPIECE, KEY, LCD, PAD, keyCentre, type KeyId } from "./flipPhoneGeometry";

/**
 * Noor's basic phone, drawn in phone units (twice its on-screen size at rest) so camera push-ins stay sharp. The body is
 * an extrusion of stacked slices, so it keeps a solid rounded edge when it turns; the front carries the earpiece, the
 * LCD, the soft keys, call and end keys and a 12-key pad, and the back carries the camera lens.
 */
export { BODY, EARPIECE, LCD, fromCentre, keyCentre, type KeyId } from "./flipPhoneGeometry";

const SLICES = 14;
const EDGE = "linear-gradient(90deg, #3a3833, #1b1a17 40%, #121110 70%, #2f2d29)";
const FACE = "linear-gradient(165deg, #3d3b36 0%, #262521 28%, #1a1916 62%, #121110 100%)";
/** Unlit keys show their numerals faintly, as on a real phone in daylight; a press lights the backlight. */
/** Printed key legends, always visible like a real phone; a press lights the backlight behind them. */
const LEGEND = "#d8d4c8";
const LIT_LEGEND = "#f1fbe6";

type FlipPhoneProps = {
  rotateX?: number;
  rotateY?: number;
  /** Keys lit by the keypad backlight, 0 to 1. */
  lit?: Partial<Record<KeyId, number>>;
  screen: ReactNode;
  /** LCD backlight glow, 0 to 1. */
  glow?: number;
};

export function FlipPhone({ rotateX = 0, rotateY = 0, lit = {}, screen, glow = 0.6 }: FlipPhoneProps) {
  const sheen = 30 + rotateY * 1.2;
  return (
    <div style={{ width: BODY.width, height: BODY.height, perspective: 3200 }}>
      <div style={{ position: "relative", width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)` }}>
        {Array.from({ length: SLICES }, (_, slice) => (
          <div key={slice} style={{ ...fill, borderRadius: BODY.radius, background: EDGE, transform: `translateZ(${-BODY.depth / 2 + (slice * BODY.depth) / (SLICES - 1)}px)` }} />
        ))}
        <div style={{ ...fill, borderRadius: BODY.radius, background: FACE, transform: `translateZ(${BODY.depth / 2 + 1}px)`, backfaceVisibility: "hidden", boxShadow: "inset 0 3px 0 rgba(255,255,255,0.14), inset 0 -6px 14px rgba(0,0,0,0.6)" }}>
          <Front lit={lit} screen={screen} glow={glow} />
          <div style={{ ...fill, borderRadius: BODY.radius, background: `linear-gradient(115deg, transparent ${sheen}%, rgba(255,255,255,0.07) ${sheen + 8}%, transparent ${sheen + 20}%)`, pointerEvents: "none" }} />
        </div>
        <div style={{ ...fill, borderRadius: BODY.radius, background: FACE, transform: `rotateY(180deg) translateZ(${BODY.depth / 2 + 1}px)`, backfaceVisibility: "hidden" }}>
          <Back />
        </div>
      </div>
    </div>
  );
}

const fill: CSSProperties = { position: "absolute", inset: 0 };

function Front({ lit, screen, glow }: { lit: Partial<Record<KeyId, number>>; screen: ReactNode; glow: number }) {
  return (
    <>
      <div style={{ position: "absolute", left: EARPIECE.x, top: EARPIECE.y, width: EARPIECE.width, height: EARPIECE.height, borderRadius: 13, background: "radial-gradient(circle, #050505 3px, #2a2925 4px) 0 0 / 13px 13px", boxShadow: "inset 0 3px 5px rgba(0,0,0,0.9)" }} />
      <div style={{ position: "absolute", left: LCD.x - 30, top: LCD.y - 30, width: LCD.width + 60, height: LCD.height + 60, borderRadius: 34, background: "#0b0b0a", boxShadow: "inset 0 4px 12px rgba(0,0,0,0.9), 0 0 0 6px #4a4842, 0 0 0 8px #151412, 0 2px 0 8px rgba(255,255,255,0.05)" }} />
      <div
        style={{
          position: "absolute",
          left: LCD.x,
          top: LCD.y,
          width: LCD.width,
          height: LCD.height,
          borderRadius: 10,
          overflow: "hidden",
          background: "var(--brand-lcd)",
          boxShadow: `inset 0 6px 18px rgba(0,0,0,0.35), 0 0 ${80 * glow}px ${16 * glow}px color-mix(in srgb, var(--brand-lcd) 40%, transparent)`,
        }}
      >
        {screen}
        <div style={{ ...fill, background: "radial-gradient(circle, rgba(30,36,24,0.07) 0.9px, transparent 1.3px) 0 0 / 5px 5px, linear-gradient(160deg, rgba(255,255,255,0.22), transparent 38%), radial-gradient(ellipse at 50% 45%, rgba(214,255,190,0.18), transparent 70%)", pointerEvents: "none" }} />
      </div>
      <NavCluster lit={lit} />
      {PAD.map(([id, letters]) => (
        <PadKey key={id} id={id} letters={letters} lit={lit[id] ?? 0} />
      ))}
      <div style={{ position: "absolute", left: 404, top: 1820, width: 32, height: 10, borderRadius: 5, background: "#060606" }} />
    </>
  );
}

function keyFace(light: number): CSSProperties {
  const glow = `rgba(127,211,155,${0.5 * light})`;
  return {
    background: `radial-gradient(ellipse at 50% 30%, rgba(255,255,255,${0.1 + 0.12 * light}) 0%, transparent 60%), linear-gradient(180deg, #3a3934 0%, #2a2925 45%, #1d1c19 100%)`,
    boxShadow: [
      "0 7px 0 #0b0b0a",
      "0 9px 14px rgba(0,0,0,0.55)",
      "inset 0 2px 0 rgba(255,255,255,0.16)",
      "inset 0 -3px 6px rgba(0,0,0,0.5)",
      `0 0 ${46 * light}px ${10 * light}px ${glow}`,
    ].join(", "),
    translate: `0 ${light * 5}px`,
  };
}

function legendStyle(light: number): CSSProperties {
  return { color: light > 0.4 ? LIT_LEGEND : LEGEND, textShadow: light > 0.4 ? "0 0 16px rgba(127,211,155,0.95)" : "0 1px 0 rgba(0,0,0,0.6)" };
}

function PadKey({ id, letters, lit }: { id: KeyId; letters: string; lit: number }) {
  const centre = keyCentre(id);
  return (
    <div style={{ position: "absolute", left: centre.x - KEY.width / 2, top: centre.y - KEY.height / 2, width: KEY.width, height: KEY.height, borderRadius: 44, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 14, paddingTop: 30, ...keyFace(lit) }}>
      <span style={{ fontFamily: "var(--brand-font-data)", fontWeight: 700, fontSize: 66, lineHeight: 1, ...legendStyle(lit) }}>{id}</span>
      {letters && <span style={{ fontFamily: "var(--brand-font-data)", fontWeight: 600, fontSize: 30, lineHeight: 1, letterSpacing: 0, ...legendStyle(lit) }}>{letters}</span>}
    </div>
  );
}

function NavCluster({ lit }: { lit: Partial<Record<KeyId, number>> }) {
  const call = lit.call ?? 0;
  return (
    <>
      <div style={{ position: "absolute", left: 90, top: 840, width: 200, height: 76, borderRadius: 38, ...keyFace(0) }} />
      <div style={{ position: "absolute", left: 550, top: 840, width: 200, height: 76, borderRadius: 38, ...keyFace(0) }} />
      <div style={{ position: "absolute", left: 300, top: 820, width: 240, height: 240, borderRadius: "50%", ...keyFace(0) }}>
        <div style={{ position: "absolute", inset: 72, borderRadius: "50%", background: "#1c1b18", boxShadow: "inset 0 3px 8px rgba(0,0,0,0.7)" }} />
      </div>
      <div style={{ position: "absolute", left: 90, top: 980, width: 200, height: 80, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center", ...keyFace(call) }}>
        <Phone size={50} weight="fill" color={call > 0.5 ? "#9be3b0" : "#3f8a59"} />
      </div>
      <div style={{ position: "absolute", left: 550, top: 980, width: 200, height: 80, borderRadius: 40, display: "flex", alignItems: "center", justifyContent: "center", ...keyFace(0) }}>
        <PhoneDisconnect size={50} weight="fill" color="#9a3a2c" />
      </div>
    </>
  );
}

function Back() {
  return (
    <>
      <div style={{ position: "absolute", left: 330, top: 170, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #3a4a5a 0%, #0b0f14 45%, #000 70%)", boxShadow: "0 0 0 14px #2a2926, 0 0 0 18px #0c0c0b, inset 0 0 20px rgba(120,160,200,0.35)" }} />
      <div style={{ position: "absolute", left: 560, top: 230, width: 44, height: 44, borderRadius: "50%", background: "radial-gradient(circle, #f4efe2, #b9b3a3)" }} />
      <div style={{ position: "absolute", left: 270, top: 1500, width: 300, height: 120, borderRadius: 30, background: "radial-gradient(circle, #050505 30%, transparent 32%) 0 0 / 24px 24px", opacity: 0.8 }} />
    </>
  );
}
