import { FileArchive } from "@phosphor-icons/react";
import { Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Phone } from "../components/Phone";
import { Recording, cutStart, type RecordingCut } from "../components/Recording";
import { Ripple } from "../components/Ripple";
import { Place } from "../components/Stage";
import { PHONE_SCREEN_HEIGHT, crop } from "../lib/focus";
import { leave, progress, settle } from "../lib/ease";
import { VOICE_START, cue } from "../timeline";
import { CAMEO_OUT } from "./framing";

/** ScreenRecording 22-23-18: a leaf in the app's camera, the check running offline, then the rust result. */
const SCAN_CUTS: RecordingCut[] = [
  { sourceFrom: 3.3, sourceTo: 4.7 },
  { sourceFrom: 13.6, sourceTo: 14.9 },
  { sourceFrom: 15.0, sourceTo: 16.4 },
];

const IN = VOICE_START.weekend - 2;
const SCAN_FROM = IN + 8;
const cutAt = (index: number) => SCAN_FROM + cutStart(SCAN_CUTS, index);
export const NOT_SURE_FROM = VOICE_START.officer - 6;
export const SEND_TAP = cue("officer", "tap") + 2;
const MODEL_AT = cue("weekend", "eight-point-five-seven-megabyte");

const CAMERA = [
  crop(IN, { x: 201, y: 400 }, 2.0),
  crop(SCAN_FROM + 12, { x: 201, y: 400 }, 2.4),
  crop(cutAt(1) - 2, { x: 201, y: 400 }, 2.4),
  crop(cutAt(1) + 8, { x: 201, y: 262 }, 3.0),
  crop(cutAt(2) - 6, { x: 201, y: 262 }, 3.0),
  crop(cutAt(2), { x: 201, y: 175 }, 4.6, 0),
  crop(NOT_SURE_FROM - 1, { x: 201, y: 175 }, 4.6, 0),
  crop(NOT_SURE_FROM, { x: 201, y: 805 }, 4),
];

/** The leaf model's real file size, dropping into the phone as the voice says it. */
function ModelChip() {
  const frame = useCurrentFrame();
  const drop = progress(frame, MODEL_AT, 16, settle);
  const gone = progress(frame, NOT_SURE_FROM - 10, 8, leave);
  return (
    <div className="absolute flex items-center gap-4 rounded-[24px] bg-paper-raised px-8 py-5 text-ink" data-box="model-chip" style={{ left: 1290, top: 760, opacity: drop * (1 - gone), translate: `0 ${(1 - drop) * -420}px`, rotate: `${(1 - drop) * 12}deg`, boxShadow: "0 30px 70px rgba(0,0,0,0.55)" }}>
      <FileArchive size={64} weight="duotone" color="#1f5135" />
      <span className="display-headline figures whitespace-nowrap" style={{ fontSize: 64, lineHeight: 1 }}>
        8.57 MB
      </span>
    </div>
  );
}

/** The family smartphone's one weekend cameo: the offline leaf check, then "send to field officer" when unsure. */
export function Cameo() {
  const frame = useCurrentFrame();
  const shown = progress(frame, IN, 14, settle) * (1 - progress(frame, CAMEO_OUT, 8, leave));
  const notSure = frame >= NOT_SURE_FROM;
  return (
    <div className="absolute inset-0" style={{ opacity: shown, translate: `${(1 - shown) * -200}px 0` }}>
      <Camera keys={CAMERA}>
        <Place x={-380}>
          <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
            {notSure ? (
              <Img src={staticFile("images/app-not-sure.png")} className="absolute inset-0 size-full" />
            ) : (
              <Sequence from={SCAN_FROM} layout="none">
                <Recording src="video/rec-scan.mp4" cuts={SCAN_CUTS} />
              </Sequence>
            )}
            <Ripple x={198} y={802} at={cutAt(0) + 38} />
            <Ripple x={201} y={718} at={SEND_TAP} />
          </Phone>
        </Place>
      </Camera>
      <ModelChip />
    </div>
  );
}
