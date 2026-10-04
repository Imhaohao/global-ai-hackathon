import { Img, staticFile, useCurrentFrame } from "remotion";
import { Ripple } from "../components/Ripple";
import { leave, progress, settle } from "../lib/ease";
import { VOICE_START, cue } from "../timeline";

/** Regions of the real officer page (backend/src/officerPage.ts, demo data), in screenshot pixels. */
const REPORTS = { x: 128, y: 493, width: 405, height: 156 };
const SEND = { x: 118, y: 1100, width: 750, height: 108 };
const IMAGE_WIDTH = 1520;
const SEND_BUTTON = { x: 380, y: 1154 };

export const APPROVE_TAP = cue("alert", "approves") - 2;
const FROM = VOICE_START.alert - 2;
const SWITCH = cue("alert", "officer") - 6;
const UNTIL = cue("alert", "approves") + 14;

type RegionProps = { region: typeof REPORTS; width: number; from: number; until: number; tapAt?: number; offsetX?: number };

function Region({ region, width, from, until, tapAt, offsetX = 0 }: RegionProps) {
  const frame = useCurrentFrame();
  const shown = progress(frame, from, 10, settle) * (1 - progress(frame, until - 8, 8, leave));
  const scale = width / region.width;
  return (
    <div className="absolute left-1/2 top-1/2 overflow-hidden rounded-[28px] bg-night-raised" style={{ width, height: region.height * scale, translate: `calc(-50% + ${offsetX}px) -50%`, opacity: shown, scale: 0.94 + 0.06 * shown, boxShadow: "0 60px 140px rgba(0,0,0,0.6)" }}>
      <Img src={staticFile("images/officer-alerts.png")} style={{ position: "absolute", width: IMAGE_WIDTH * scale, maxWidth: "none", left: -region.x * scale, top: -region.y * scale }} />
      {tapAt !== undefined && <Ripple x={(SEND_BUTTON.x - region.x) * scale} y={(SEND_BUTTON.y - region.y) * scale} at={tapAt} />}
    </div>
  );
}

/** The same field officer, beside the button they press. */
function OfficerThumb({ from, until }: { from: number; until: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, from, 10, settle) * (1 - progress(frame, until - 8, 8, leave));
  return (
    <div className="absolute overflow-hidden rounded-[28px]" style={{ left: 150, top: 300, width: 360, height: 480, opacity: shown, rotate: "-2deg", boxShadow: "0 50px 100px rgba(0,0,0,0.6), 0 0 0 8px #f2f0ea" }}>
      <Img src={staticFile("images/field-officer.jpg")} className="size-full object-cover" style={{ objectPosition: "50% 10%" }} />
    </div>
  );
}

/** The officer's view of an outbreak: three farms reporting, then one tap to send the alert to the area. */
export function OfficerApproval() {
  return (
    <>
      <Region region={REPORTS} width={900} from={FROM} until={SWITCH} />
      <Region region={SEND} width={1150} from={SWITCH} until={UNTIL} tapAt={APPROVE_TAP} offsetX={220} />
      <OfficerThumb from={SWITCH} until={UNTIL} />
    </>
  );
}

export const OFFICER_WINDOW = { from: FROM, until: UNTIL };
