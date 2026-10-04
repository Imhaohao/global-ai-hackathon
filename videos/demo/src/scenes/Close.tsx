import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Footage } from "../components/Footage";
import { Phone } from "../components/Phone";
import { Facts, Place, Stage } from "../components/Stage";
import { Words } from "../components/Words";
import { PHONE_SCREEN_HEIGHT, rest, zoomAt } from "../lib/focus";
import { progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.close.from;
const local = (abs: number) => abs - start;
const PHONE_AT = { x: -380, y: 0 };
const PHONE_SHOT = local(cue("close", "And")) - 4;
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
              <Camera keys={[rest(PHONE_SHOT), zoomAt(SURE + 6, { x: 201, y: 190 }, 1.3, PHONE_AT), zoomAt(PERSON - 2, { x: 201, y: 190 }, 1.3, PHONE_AT), zoomAt(PERSON + 14, { x: 201, y: 715 }, 1.35, PHONE_AT)]}>
                <Place x={PHONE_AT.x}>
                  <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
                    <Img src={staticFile("images/app-not-sure.png")} className="absolute inset-0 size-full" />
                  </Phone>
                </Place>
              </Camera>
              <Facts>
                <Words text="Not sure?" at={SURE - 4} className="display-poster text-headline text-on-night" />
                <Words text="Ask a person." at={PERSON - 4} className="display-poster text-headline text-on-night rust-glow" />
              </Facts>
            </Stage>
          </AbsoluteFill>
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
}
