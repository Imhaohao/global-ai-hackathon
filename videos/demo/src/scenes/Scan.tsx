import { CellSignalSlash, Leaf } from "@phosphor-icons/react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Footage } from "../components/Footage";
import { Phone } from "../components/Phone";
import { Recording, cutStart, type RecordingCut } from "../components/Recording";
import { Ripple } from "../components/Ripple";
import { Facts, Place, Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { Wordmark } from "../components/Wordmark";
import { PHONE_SCREEN_HEIGHT, focus, rest, zoomAt } from "../lib/focus";
import { leave, progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.scan.from;
const local = (abs: number) => abs - start;
const LEAF_SHOT = local(cue("scan", "Skip")) - 2;
const PHONE_SHOT = LEAF_SHOT + 30;
const PHONE_AT = { x: -380, y: 0 };

/** ScreenRecording 22-23-18: the camera on a rust leaf, Ready for advice, the action card, then step 2 of 5. */
export const SCAN_CUTS: RecordingCut[] = [
  { sourceFrom: 3.3, sourceTo: 4.7 },
  { sourceFrom: 13.6, sourceTo: 14.9 },
  { sourceFrom: 15.0, sourceTo: 16.4 },
  { sourceFrom: 20.6, sourceTo: 22.0 },
];
const cutAt = (index: number) => PHONE_SHOT + cutStart(SCAN_CUTS, index);
export const SHUTTER_AT = cutAt(0) + 38;
const SEE_ADVICE_AT = cutAt(1) + 36;
const NEXT_AT = cutAt(3) + 20;

const CAMERA = [
  focus(PHONE_SHOT, { x: 201, y: 400 }, 2.35, PHONE_AT),
  rest(PHONE_SHOT + 26),
  rest(cutAt(2) + 4),
  zoomAt(cutAt(2) + 22, { x: 201, y: 150 }, 1.3, PHONE_AT),
  zoomAt(cutAt(3) + 6, { x: 201, y: 300 }, 1.25, PHONE_AT),
  zoomAt(local(cue("scan", "steps")) + 4, { x: 190, y: 585 }, 1.45, PHONE_AT),
];

function Meet() {
  const frame = useCurrentFrame();
  const out = progress(frame, LEAF_SHOT - 6, 6, leave);
  return (
    <AbsoluteFill className="items-center justify-center bg-paper" style={{ opacity: 1 - out }}>
      <div className="flex items-center gap-10">
        <div className="display-headline text-headline text-ink-muted" style={{ opacity: progress(frame, 0, 6) }}>
          Meet
        </div>
        <Wordmark at={6} size={200} tone="paper" />
      </div>
    </AbsoluteFill>
  );
}

/** Meet Leaf Doctor, then a match cut from a real coffee leaf to the leaf in the app's camera, and the action card. */
export function Scan() {
  return (
    <AbsoluteFill className="bg-night">
      <Sequence from={LEAF_SHOT} durationInFrames={34} layout="none">
        <Footage src="video/coffee-leaves.mp4" zoom={[1.05, 1.6]} shade={0.1} />
      </Sequence>
      <Sequence from={PHONE_SHOT} layout="none">
        <PhoneShot />
      </Sequence>
      <Sequence durationInFrames={LEAF_SHOT} layout="none">
        <Meet />
      </Sequence>
    </AbsoluteFill>
  );
}

function PhoneShot() {
  const frame = useCurrentFrame() + PHONE_SHOT;
  const appear = progress(frame, PHONE_SHOT, 8);
  return (
    <AbsoluteFill style={{ opacity: appear }}>
      <Stage backdrop="images/backdrop-leaves.jpg">
        <Sequence from={-PHONE_SHOT} layout="none">
          <Camera keys={CAMERA}>
            <Place x={PHONE_AT.x}>
              <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
                <Sequence from={PHONE_SHOT} layout="none">
                  <Recording src="video/rec-scan.mp4" cuts={SCAN_CUTS} />
                </Sequence>
                <Ripple x={198} y={802} at={SHUTTER_AT} />
                <Ripple x={200} y={401} at={SEE_ADVICE_AT} />
                <Ripple x={322} y={505} at={NEXT_AT} />
              </Phone>
            </Place>
          </Camera>
          <Facts>
            <Tag icon={<Leaf size={44} weight="bold" />} from={local(cue("scan", "twenty"))} to={local(SCENES.scan.to)}>
              Trained on 20,311 coffee-leaf photos
            </Tag>
            <Tag icon={<CellSignalSlash size={44} weight="bold" />} from={local(cue("scan", "offline"))} to={local(SCENES.scan.to)}>
              Runs on the phone with no signal
            </Tag>
          </Facts>
        </Sequence>
      </Stage>
    </AbsoluteFill>
  );
}
