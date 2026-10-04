import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Phone } from "../components/Phone";
import { Recording } from "../components/Recording";
import { Ripple } from "../components/Ripple";
import { Place } from "../components/Stage";
import { PHONE_SCREEN_HEIGHT } from "../lib/focus";
import { leave, progress, settle } from "../lib/ease";
import { APP_SHOTS, SEND_TAP, type AppShot } from "./shots";

/** One real app shot on the iPhone: large, pushing in on the moment the voice is explaining. */
function Shot({ shot }: { shot: AppShot }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, shot.from, 8, settle) * (1 - progress(frame, shot.to - 6, 6, leave));
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <Camera keys={shot.keys}>
        <Place x={shot.phoneX}>
          <Phone screenHeight={PHONE_SCREEN_HEIGHT}>
            {shot.media.kind === "recording" ? (
              <Sequence from={shot.from} layout="none">
                <Recording src={shot.media.src} cuts={shot.media.cuts} />
              </Sequence>
            ) : (
              <Img src={staticFile(shot.media.src)} className="absolute inset-0 size-full" />
            )}
            {shot.id === "officer" && <Ripple x={201} y={435} at={SEND_TAP} />}
          </Phone>
        </Place>
      </Camera>
    </AbsoluteFill>
  );
}

/** Every iPhone shot of the real app, each shown only in its own window of the timeline. */
export function AppShots() {
  const frame = useCurrentFrame();
  return (
    <>
      {APP_SHOTS.filter((shot) => frame >= shot.from - 1 && frame < shot.to + 1).map((shot) => (
        <Shot key={shot.id} shot={shot} />
      ))}
    </>
  );
}
