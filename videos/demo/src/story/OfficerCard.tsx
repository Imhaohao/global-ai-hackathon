import { ChatText } from "@phosphor-icons/react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";
import { SEND_TAP } from "../app/shots";
import { SCENES, cue } from "../timeline";

const IN = SEND_TAP + 4;
const CASE_LANDS = cue("officer", "officer") - 4;
const OUT = SCENES.officer.to;

/** The cooperative field officer, a real photo from Meru County: Noor's case lands as a text. */
export function OfficerCard() {
  const frame = useCurrentFrame();
  if (frame < IN - 2 || frame > OUT + 2) return null;
  const shown = progress(frame, IN, 14, settle) * (1 - progress(frame, OUT - 8, 8, leave));
  const caseLands = progress(frame, CASE_LANDS, 12, settle);
  return (
    <div className="absolute" style={{ left: 1200, top: 200, width: 560, height: 640, opacity: shown, translate: `${(1 - shown) * 200}px 0`, rotate: "2deg" }}>
      <div className="absolute inset-0 overflow-hidden rounded-[32px]" style={{ boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 10px #f2f0ea" }}>
        <Img src={staticFile("images/officer-kenya.jpg")} className="size-full object-cover" />
      </div>
      <div className="absolute -left-[70px] top-[50px] flex size-[150px] items-center justify-center rounded-full bg-paper-raised" style={{ opacity: caseLands, scale: 0.4 + 0.6 * caseLands, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <ChatText size={84} weight="fill" color="#1f5135" />
      </div>
    </div>
  );
}
