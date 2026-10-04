import { Warning } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { leave, progress } from "../lib/ease";
import { lcdAt } from "../story";
import { SCENES, VOICE_START, cue } from "../timeline";
import { Cameo } from "./Cameo";
import { CAMEO_OUT } from "./framing";
import { HeroPhone } from "./HeroPhone";
import { OFFICER_WINDOW, OfficerApproval } from "./OfficerApproval";
import { OfficerCard } from "./OfficerCard";
import { SeedPacket } from "./SeedPacket";
import { SmsRoute } from "./SmsRoute";

const FRAMES = Array.from({ length: SCENES.story.to - SCENES.story.from }, (_, index) => index + SCENES.story.from);
const DEMO_FRAMES = FRAMES.filter((frame) => lcdAt(frame).tag === "Demo data");
const SHOP_DEMO = { from: DEMO_FRAMES[0], to: DEMO_FRAMES[DEMO_FRAMES.length - 1] + 1 };

/**
 * Noor's day with Leaf Doctor, told around her basic phone, with one weekend cameo from the family smartphone, the SMS
 * route to the hub phone, and the field officer. Rendered on the absolute timeline: every overlay is timed by voice cues.
 */
export function Story() {
  const frame = useCurrentFrame();
  if (frame < SCENES.story.from - 2) return null;
  const fadeIn = progress(frame, SCENES.story.from, 10);
  const fadeOut = 1 - progress(frame, SCENES.story.to - 8, 8, leave);
  return (
    <AbsoluteFill className="bg-night" style={{ opacity: fadeIn * fadeOut }}>
      <Stage backdrop="images/backdrop-farm.jpg">
        <SeedPacket from={VOICE_START.seed + 30} scratchAt={cue("seed", "code") - 6} until={VOICE_START.weekend} />
        <SmsRoute />
        <HeroPhone />
        {frame >= VOICE_START.weekend - 4 && frame <= CAMEO_OUT + 14 && <Cameo />}
        <OfficerCard />
        {frame >= OFFICER_WINDOW.from - 2 && frame <= OFFICER_WINDOW.until + 2 && <OfficerApproval />}
        <div className="absolute" style={{ left: 1430, top: 480 }}>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={SHOP_DEMO.from} to={SHOP_DEMO.to}>
            Demo data
          </Tag>
        </div>
        <div className="absolute" style={{ left: 1420, top: 140 }}>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={OFFICER_WINDOW.from + 4} to={OFFICER_WINDOW.until}>
            Demo data
          </Tag>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
