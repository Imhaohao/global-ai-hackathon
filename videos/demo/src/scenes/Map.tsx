import { Warning, UsersThree } from "@phosphor-icons/react";
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Footage } from "../components/Footage";
import { Phone } from "../components/Phone";
import { RainWeek } from "../components/RainWeek";
import { Ripple } from "../components/Ripple";
import { Facts, Place, Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { PHONE_SCREEN_HEIGHT, crop } from "../lib/focus";
import { leave, progress } from "../lib/ease";
import { SCENES, cue } from "../timeline";

const start = SCENES.map.from;
const local = (abs: number) => abs - start;
const PHONE_AT = { x: -380, y: 0 };
const MAP_SHOT = 26;
export const MAP_TAP = MAP_SHOT + 22;
const MAP_CARD = { x: 201, y: 240 };
const RUST_CIRCLE = { x: 231, y: 205 };
const OFFICER_SHOT = local(cue("map", "When")) + 4;
const RAIN_SHOT = local(cue("map", "spray")) - 6;

function MapPhone() {
  const frame = useCurrentFrame();
  const tapped = frame >= MAP_TAP + 3;
  return (
    <AbsoluteFill style={{ opacity: 1 - progress(frame, OFFICER_SHOT - 4, 6, leave) }}>
      <Camera keys={[crop(MAP_SHOT, MAP_CARD, 1.6), crop(MAP_SHOT + 16, MAP_CARD, 2.3), crop(MAP_TAP + 4, MAP_CARD, 2.3), crop(MAP_TAP + 20, RUST_CIRCLE, 2.9)]}>
        <Place x={PHONE_AT.x}>
          <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
            <Img src={staticFile(tapped ? "images/app-map-selected.png" : "images/app-map.png")} className="absolute inset-0 size-full" />
            <Ripple x={RUST_CIRCLE.x} y={197} at={MAP_TAP} />
          </Phone>
        </Place>
      </Camera>
    </AbsoluteFill>
  );
}

const OFFICER_IMAGE_WIDTH = 1520;
/** The part of the officer page screenshot that holds the alert card, in image pixels. */
const CARD_TOP = 300;
const CARD_BOTTOM = 1250;
const WINDOW_WIDTH = 1000;
const WINDOW_AT = { x: -400, y: 0 };
const SEND_BUTTON = { x: 380, y: 1150 };

/** The real officer approval page (backend/src/officerPage.ts) rendered with demo data, in a plain browser window. */
/** A camera key that puts a layer point at `toY` below the frame centre, left of the facts column. */
function aim(at: number, point: { x: number; y: number }, zoom: number, toY: number) {
  return { at, scale: zoom, x: -310 - zoom * point.x, y: toY - zoom * point.y };
}

function OfficerWindow() {
  const frame = useCurrentFrame();
  const ratio = WINDOW_WIDTH / OFFICER_IMAGE_WIDTH;
  const height = (CARD_BOTTOM - CARD_TOP) * ratio;
  const send = { x: WINDOW_AT.x + SEND_BUTTON.x * ratio - WINDOW_WIDTH / 2, y: WINDOW_AT.y + 20 + (SEND_BUTTON.y - CARD_TOP) * ratio - height / 2 };
  const officer = local(cue("map", "officer"));
  const card = { x: WINDOW_AT.x, y: WINDOW_AT.y };
  const keys = [aim(OFFICER_SHOT, card, 1.1, 0), aim(OFFICER_SHOT + 16, card, 1.25, 0), aim(officer - 4, card, 1.25, 0), aim(officer + 16, send, 1.9, 140)];
  return (
    <Camera keys={keys}>
      <Place x={WINDOW_AT.x} y={WINDOW_AT.y}>
        <div className="overflow-hidden rounded-[22px] bg-night-raised" style={{ width: WINDOW_WIDTH, boxShadow: "0 60px 140px rgba(0,0,0,0.55)", opacity: progress(frame, OFFICER_SHOT + 2, 8) }}>
          <div className="flex h-10 items-center gap-2 px-4">
            {["#ff5f57", "#febc2e", "#28c840"].map((colour) => (
              <div key={colour} className="size-3 rounded-full" style={{ background: colour }} />
            ))}
          </div>
          <div className="overflow-hidden" style={{ height }}>
            <Img src={staticFile("images/officer-alerts.png")} style={{ width: WINDOW_WIDTH, marginTop: -CARD_TOP * ratio }} />
          </div>
        </div>
      </Place>
    </Camera>
  );
}

/** Hotspot map, officer-approved neighbour alerts, and the rain rule that gates spray advice. */
export function Map() {
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={MAP_SHOT + 8} layout="none">
        <Footage src="video/coffee-rows.mp4" zoom={[1.0, 1.25]} shade={0.2} />
      </Sequence>
      <Sequence from={MAP_SHOT} durationInFrames={RAIN_SHOT - MAP_SHOT + 6} layout="none">
        <Sequence from={-MAP_SHOT} layout="none">
          <Stage backdrop="images/backdrop-rows.jpg">
            <Sequence durationInFrames={OFFICER_SHOT + 4} layout="none">
              <MapPhone />
              <Facts>
                <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={MAP_SHOT + 4} to={OFFICER_SHOT}>
                  Sightings shown are simulated
                </Tag>
                <Tag from={MAP_SHOT + 14} to={OFFICER_SHOT}>Checks within 25 m merge into one circle</Tag>
              </Facts>
            </Sequence>
            <Sequence from={OFFICER_SHOT} layout="none">
              <Sequence from={-OFFICER_SHOT} layout="none">
                <OfficerWindow />
                <Facts left={1300} width={590}>
                  <Tag icon={<UsersThree size={44} weight="bold" />} from={local(cue("map", "three"))} to={RAIN_SHOT + 6}>
                    Three farms with one disease in a week draft an alert
                  </Tag>
                  <Tag from={local(cue("map", "approves"))} to={RAIN_SHOT + 6}>An officer edits and sends it, or dismisses it</Tag>
                  <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={local(cue("map", "approves")) + 8} to={RAIN_SHOT + 6}>
                    Page shown with demo data
                  </Tag>
                </Facts>
              </Sequence>
            </Sequence>
          </Stage>
        </Sequence>
      </Sequence>
      <Sequence from={RAIN_SHOT} layout="none">
        <Footage src="video/field-rain.mp4" zoom={[1.05, 1.15]} shade={0.55} />
        <Sequence from={-RAIN_SHOT} layout="none">
          <AbsoluteFill className="items-center justify-center">
            <RainWeek wetAt={[local(cue("map", "advice")), local(cue("map", "waits")), local(cue("map", "wet"))]} />
          </AbsoluteFill>
        </Sequence>
      </Sequence>
    </AbsoluteFill>
  );
}
