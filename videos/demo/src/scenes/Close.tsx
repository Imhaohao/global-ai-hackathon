import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Footage } from "../components/Footage";
import { Phone } from "../components/Phone";
import { Facts, Place, Stage } from "../components/Stage";
import { Words } from "../components/Words";
import { PHONE_SCREEN_HEIGHT, crop } from "../lib/focus";
import { progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.close.from;
const local = (abs: number) => abs - start;
const PHONE_AT = { x: -380, y: 0 };
const PHONE_SHOT = local(cue("close", "And")) - 4;
/** The guardrail lines are long, so this phone sits further left than the others. */
const LEFT = -400;
const NOT_SURE = { x: 201, y: 205 };
const GET_HELP = { x: 201, y: 640 };
const SURE = local(cue("close", "sure"));
const PERSON = local(cue("close", "person"));

/** Noor's morning on the farm, then the guardrail: when the app is not sure, it sends her to a person. */
export function Close() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={PHONE_SHOT + 8} layout="none">
        <Footage src="video/coffee-farm.mp4" zoom={[1.02, 1.1]} shade={0.3} />
        <AbsoluteFill className="items-start justify-end p-[120px]">
          <Words text="Noor's morning walk" at={local(cue("close", "Noor's"))} className="display-poster text-poster text-on-night" stagger={4} />
        </AbsoluteFill>
      </Sequence>
      <Sequence from={PHONE_SHOT} layout="none">
        <Sequence from={-PHONE_SHOT} layout="none">
          <AbsoluteFill style={{ opacity: progress(frame, PHONE_SHOT, 8) }}>
            <Stage backdrop="images/backdrop-farm.jpg">
              <Camera keys={[crop(PHONE_SHOT, NOT_SURE, 1.7, LEFT), crop(PHONE_SHOT + 18, NOT_SURE, 2.45, LEFT), crop(PERSON - 4, NOT_SURE, 2.45, LEFT), crop(PERSON + 14, GET_HELP, 2.35, LEFT)]}>
                <Place x={PHONE_AT.x}>
                  <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
                    <Img src={staticFile("images/app-not-sure.png")} className="absolute inset-0 size-full" />
                  </Phone>
                </Place>
              </Camera>
              <Facts left={1170} width={740}>
                <Words text="Not sure?" at={SURE - 4} className="display-poster text-headline whitespace-nowrap text-on-night" />
                <Words text="Ask a person." at={PERSON - 4} className="display-poster text-headline whitespace-nowrap text-on-night rust-glow" />
              </Facts>
            </Stage>
          </AbsoluteFill>
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
}
