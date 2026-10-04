import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FlipPhone } from "../components/FlipPhone";
import { LcdScreen } from "../components/Lcd";
import { lcdAt, litAt } from "../story";
import { BASE_SCALE, PHONE_SIZE, framingAt } from "./framing";

/** Noor's basic phone, the hero of the story: turned, placed and framed on the part the voice is explaining. */
export function HeroPhone() {
  const frame = useCurrentFrame();
  const view = framingAt(frame);
  return (
    <AbsoluteFill className="items-center justify-center" style={{ translate: `${view.placeX}px 0` }}>
      <div style={{ scale: view.zoom, translate: `${view.x}px ${view.y}px` }}>
        <div style={PHONE_SIZE}>
          <div style={{ scale: BASE_SCALE, transformOrigin: "0 0", filter: "drop-shadow(0 60px 80px rgba(0,0,0,0.6))" }}>
            <FlipPhone rotateY={view.rotateY} rotateX={view.rotateX} lit={litAt(frame)} screen={<LcdScreen view={lcdAt(frame).view} />} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
