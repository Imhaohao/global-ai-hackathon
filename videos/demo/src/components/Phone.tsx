import type { ReactNode } from "react";

/** The iPhone 17 Pro screen in points; every recording and capture in this video is 1206x2622 pixels at 3x. */
export const SCREEN = { width: 402, height: 874, radius: 62 } as const;

const BEZEL = 0.042;

type PhoneProps = {
  /** Height of the visible screen on the video frame, in pixels. */
  screenHeight: number;
  children: ReactNode;
  dark?: boolean;
};

/**
 * A titanium iPhone body drawn to the 17 Pro's proportions. Children are laid out in screen points (402 x 874) and
 * scaled to fit, so tap positions can be written in the same units as the device. The body's corner radius is the
 * screen's plus the bezel, so the two curves stay concentric.
 */
export function Phone({ screenHeight, children, dark = false }: PhoneProps) {
  const scale = screenHeight / SCREEN.height;
  const bezel = screenHeight * BEZEL;
  const screenWidth = SCREEN.width * scale;
  const screenRadius = SCREEN.radius * scale;
  return (
    <div
      className="relative"
      style={{
        width: screenWidth + bezel * 2,
        height: screenHeight + bezel * 2,
        padding: bezel,
        borderRadius: screenRadius + bezel,
        background: "linear-gradient(140deg, #6b6862 0%, #2d2c29 18%, #191816 52%, #3a3834 86%, #77736b 100%)",
        boxShadow: [
          "0 60px 140px rgba(0,0,0,0.55)",
          "0 18px 40px rgba(0,0,0,0.35)",
          "inset 0 0 0 1.5px rgba(255,255,255,0.16)",
          "inset 0 0 0 4px rgba(0,0,0,0.65)",
        ].join(", "),
      }}
    >
      <SideButtons height={screenHeight + bezel * 2} />
      <div
        className="relative size-full overflow-hidden"
        style={{ borderRadius: screenRadius, background: dark ? "#000" : "#f3f6f2", boxShadow: "0 0 0 2px #050505" }}
      >
        <div style={{ width: SCREEN.width, height: SCREEN.height, transform: `scale(${scale})`, transformOrigin: "0 0", position: "relative" }}>{children}</div>
      </div>
    </div>
  );
}

const BUTTON_STYLE = { background: "linear-gradient(90deg, #4a4843, #23221f)", borderRadius: 3 } as const;

function SideButtons({ height }: { height: number }) {
  return (
    <>
      <div className="absolute" style={{ ...BUTTON_STYLE, left: -4, top: height * 0.2, width: 5, height: height * 0.045 }} />
      <div className="absolute" style={{ ...BUTTON_STYLE, left: -4, top: height * 0.27, width: 5, height: height * 0.075 }} />
      <div className="absolute" style={{ ...BUTTON_STYLE, left: -4, top: height * 0.36, width: 5, height: height * 0.075 }} />
      <div className="absolute" style={{ ...BUTTON_STYLE, right: -4, top: height * 0.29, width: 5, height: height * 0.11 }} />
    </>
  );
}
