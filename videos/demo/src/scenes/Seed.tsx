import { ChatText, Warning } from "@phosphor-icons/react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Phone } from "../components/Phone";
import { Recording, cutStart, type RecordingCut } from "../components/Recording";
import { Facts, Place, Stage } from "../components/Stage";
import { Stat } from "../components/Stat";
import { Tag } from "../components/Tag";
import { PHONE_SCREEN_HEIGHT, rest, zoomAt } from "../lib/focus";
import { leave, progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.seed.from;
const local = (abs: number) => abs - start;
const PHONE_AT = { x: -380, y: 0 };

/** ScreenRecording 22-33-02: scanning a packet, "Genuine seed", a recalled lot, then the KEPHIS 1393 step. */
export const SEED_CUTS: RecordingCut[] = [
  { sourceFrom: 3.4, sourceTo: 6.8 },
  { sourceFrom: 13.1, sourceTo: 14.5 },
  { sourceFrom: 18.8, sourceTo: 20.6 },
];
const cutAt = (index: number) => cutStart(SEED_CUTS, index);
export const SEED_SCAN_AT = 18;

const SO = local(cue("seed", "So"));
const CAMERA = [rest(cutAt(0) + 70), zoomAt(cutAt(0) + 88, { x: 201, y: 250 }, 1.3, PHONE_AT), zoomAt(cutAt(2) - 4, { x: 201, y: 250 }, 1.3, PHONE_AT), zoomAt(cutAt(2) + 14, { x: 201, y: 494 }, 1.5, PHONE_AT)];

/** One study's fake-seed figure, then the seed check: a demo barcode registry and the real KEPHIS 1393 text. */
export function Seed() {
  const frame = useCurrentFrame();
  const statOut = progress(frame, SO - 4, 8, leave);
  return (
    <AbsoluteFill>
      <Stage backdrop="images/backdrop-farm.jpg">
        <Camera keys={CAMERA}>
          <Place x={PHONE_AT.x}>
            <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
              <Sequence layout="none">
                <Recording src="video/rec-seed.mp4" cuts={SEED_CUTS} />
              </Sequence>
            </Phone>
          </Place>
        </Camera>
        <Facts>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={cutAt(0) + 60} to={cutAt(2) + 4}>
            Barcode scan checks a demo registry
          </Tag>
          <div style={{ opacity: 1 - statOut }}>
            <Stat value="40%+" label="of retail maize seed packets tested in a Kenyan study were problematic" source="J-PAL evaluation, Kenya" at={local(cue("seed", "over"))} size="headline" />
          </div>
          <Tag icon={<ChatText size={44} weight="bold" />} from={local(cue("seed", "KEPHIS"))} to={local(SCENES.seed.to) + 4}>
            Real check: text the KEPHIS code to 1393
          </Tag>
        </Facts>
      </Stage>
    </AbsoluteFill>
  );
}
