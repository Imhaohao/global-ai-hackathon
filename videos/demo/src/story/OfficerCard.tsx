import { ChatText, PhoneCall } from "@phosphor-icons/react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";
import { CALL_PRESS } from "../story";
import { VOICE_START, cue } from "../timeline";

const IN = cue("officer", "officer") - 8;
const CASE_LANDS = cue("officer", "officer") + 4;
const OUT = VOICE_START.alert + 6;

/** The cooperative field officer, a real photo: Noor's case lands as a text, then her call rings through. */
export function OfficerCard() {
  const frame = useCurrentFrame();
  if (frame < IN - 2 || frame > OUT + 2) return null;
  const shown = progress(frame, IN, 14, settle) * (1 - progress(frame, OUT - 10, 10, leave));
  const caseLands = progress(frame, CASE_LANDS, 12, settle);
  const ringing = frame >= CALL_PRESS + 4;
  const ring = ((frame - CALL_PRESS) % 20) / 20;
  return (
    <div className="absolute" style={{ left: 1320, top: 190, width: 470, height: 640, opacity: shown, translate: `${(1 - shown) * 200}px 0`, rotate: "2deg" }}>
      {ringing && <div className="absolute inset-0 rounded-[32px]" style={{ boxShadow: `0 0 0 ${8 + ring * 40}px rgba(127,211,155,${0.6 * (1 - ring)})` }} />}
      <div className="absolute inset-0 overflow-hidden rounded-[32px]" style={{ boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 10px #f2f0ea" }}>
        <Img src={staticFile("images/field-officer.jpg")} className="size-full object-cover" style={{ objectPosition: "50% 10%" }} />
      </div>
      <div className="absolute -left-[60px] top-[60px] flex size-[130px] items-center justify-center rounded-full bg-paper-raised" style={{ opacity: ringing ? 0 : caseLands, scale: 0.4 + 0.6 * caseLands, boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <ChatText size={72} weight="fill" color="#1f5135" />
      </div>
      <div className="absolute -left-[60px] top-[60px] flex size-[130px] items-center justify-center rounded-full" style={{ opacity: ringing ? 1 : 0, background: "#1f7a3f", boxShadow: "0 20px 50px rgba(0,0,0,0.5)" }}>
        <PhoneCall size={72} weight="fill" color="#ffffff" />
      </div>
    </div>
  );
}
