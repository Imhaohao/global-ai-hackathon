import { Warning } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { leave, progress } from "../lib/ease";
import { lcdAt } from "../story";
import { SCENES } from "../timeline";
import { HeroPhone } from "./HeroPhone";

const FRAMES = Array.from({ length: SCENES.sms.to - SCENES.sms.from }, (_, index) => index + SCENES.sms.from);
const DEMO_FRAMES = FRAMES.filter((frame) => lcdAt(frame).tag === "Demo data");
const SHOP_DEMO = { from: DEMO_FRAMES[0], to: DEMO_FRAMES[DEMO_FRAMES.length - 1] + 1 };

/** SMS on Noor's basic phone: her question, the real reply, a follow-up, SHOP and the 1393 seed code. */
export function SmsScene() {
  const frame = useCurrentFrame();
  if (frame < SCENES.sms.from - 2 || frame > SCENES.sms.to + 2) return null;
  const shown = progress(frame, SCENES.sms.from, 10) * (1 - progress(frame, SCENES.sms.to - 8, 8, leave));
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <Stage backdrop="images/backdrop-farm.jpg">
        <HeroPhone />
        <div className="absolute" style={{ left: 1430, top: 620 }}>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={SHOP_DEMO.from} to={SHOP_DEMO.to}>
            Demo data
          </Tag>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
