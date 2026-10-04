import { ChatText } from "@phosphor-icons/react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Footage } from "../components/Footage";
import { Phone } from "../components/Phone";
import { Recording, cutStart, type RecordingCut } from "../components/Recording";
import { Facts, Place, Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { Words } from "../components/Words";
import { PHONE_SCREEN_HEIGHT, crop } from "../lib/focus";
import { leave, progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.sms.from;
const local = (abs: number) => abs - start;
export const SMS_PHONE_AT_LOCAL = 40;
const PHONE_AT = { x: -380, y: 0 };

/** ScreenRecording 22-52-31: the farmer types, the bot answers about brown eye spot, then about fertilizer. */
export const SMS_CUTS: RecordingCut[] = [
  { sourceFrom: 2.0, sourceTo: 22.2, rate: 18 },
  { sourceFrom: 29.7, sourceTo: 31.0 },
  { sourceFrom: 43.0, sourceTo: 52.6, rate: 18 },
  { sourceFrom: 56.3, sourceTo: 58.0 },
];
const cutAt = (index: number) => SMS_PHONE_AT_LOCAL + cutStart(SMS_CUTS, index);
/** Scene-local frames where each bot reply lands on screen. */
export const SMS_REPLIES = [cutAt(1) + 9, cutAt(3) + 9];
/** Scene-local frames of the two typing runs, for key clicks. */
export const SMS_TYPING = [
  [cutAt(0), cutAt(1)],
  [cutAt(2), cutAt(3)],
] as const;

const COMPOSER = { x: 201, y: 520 };
const REPLY = { x: 190, y: 400 };
const CAMERA = [
  crop(cutAt(0), COMPOSER, 1.45),
  crop(cutAt(1) - 4, COMPOSER, 1.65),
  crop(cutAt(1) + 12, REPLY, 2.15),
  crop(cutAt(2) - 2, REPLY, 2.15),
  crop(cutAt(2) + 10, COMPOSER, 1.65),
  crop(cutAt(3) - 2, COMPOSER, 1.65),
  crop(cutAt(3) + 12, REPLY, 2.15),
];

/** No smartphone? A real basic phone, then the real text conversation with the Leaf Doctor bot. */
export function Sms() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={SMS_PHONE_AT_LOCAL + 6} layout="none">
        <Footage src="video/basic-phone.mp4" zoom={[1.08, 1.2]} shade={0.45} />
        <AbsoluteFill className="items-center justify-center">
          <div style={{ opacity: 1 - progress(frame, SMS_PHONE_AT_LOCAL - 6, 6, leave) }}>
            <Words text="No smartphone?" at={local(cue("sms", "No"))} className="display-poster text-poster text-on-night" stagger={4} />
          </div>
        </AbsoluteFill>
      </Sequence>
      <Sequence from={SMS_PHONE_AT_LOCAL} layout="none">
        <AbsoluteFill style={{ opacity: progress(frame, SMS_PHONE_AT_LOCAL, 8) }}>
          <Stage backdrop="images/backdrop-phone.jpg">
            <Sequence from={-SMS_PHONE_AT_LOCAL} layout="none">
              <Camera keys={CAMERA}>
                <Place x={PHONE_AT.x}>
                  <Phone screenHeight={PHONE_SCREEN_HEIGHT} dark>
                    <Sequence from={SMS_PHONE_AT_LOCAL} layout="none">
                      <Recording src="video/rec-sms.mp4" cuts={SMS_CUTS} />
                    </Sequence>
                  </Phone>
                </Place>
              </Camera>
              <Facts>
                <Words text="Text it." at={Math.max(local(cue("sms", "Text")), SMS_PHONE_AT_LOCAL + 4)} className="display-poster text-headline whitespace-nowrap text-on-night" />
                <Tag icon={<ChatText size={44} weight="bold" />} from={local(cue("sms", "advice"))} to={local(SCENES.sms.to) + 4}>
                  A real conversation with the bot
                </Tag>
              </Facts>
            </Sequence>
          </Stage>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
}
