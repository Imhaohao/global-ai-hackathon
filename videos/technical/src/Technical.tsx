import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { progress } from "./lib/ease";
import { Caption } from "./components/Caption";
import { Soundtrack } from "./components/Soundtrack";
import { Bench } from "./scenes/Bench";
import { Biology } from "./scenes/Biology";
import { Close } from "./scenes/Close";
import { Data } from "./scenes/Data";
import { Hotspots } from "./scenes/Hotspots";
import { Intro } from "./scenes/Intro";
import { Seed } from "./scenes/Seed";
import { Sms } from "./scenes/Sms";
import { beat, BEATS, DURATION, sceneLength, type BeatId } from "./lib/timeline";
import { CUES } from "./cues";

const SCENES: { id: BeatId; component: () => React.ReactNode }[] = [
  { id: "data", component: Data },
  { id: "biology", component: Biology },
  { id: "bench", component: Bench },
  { id: "sms", component: Sms },
  { id: "seed", component: Seed },
  { id: "hotspots", component: Hotspots },
  { id: "close", component: Close },
];

/** The music's closing hit sits at 54 s in the track; starting it 1.5 s in lands that hit under the end-card wordmark. */
const MUSIC_FROM = 45;

/** Each scene arrives with a short push: a little large and soft, settling sharp in eight frames. */
function Enter({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const settle = progress(frame, 0, 8);
  return <AbsoluteFill style={{ opacity: settle, scale: String(1.04 - 0.04 * settle), filter: settle < 1 ? `blur(${(1 - settle) * 10}px)` : undefined }}>{children}</AbsoluteFill>;
}

/** The technical walkthrough in the farmer's order: hook, leaf model, SMS, seed check, hotspots, close. */
export function Technical() {
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={beat("data").from}>
        <Intro />
      </Sequence>
      {SCENES.map(({ id, component: Scene }) => (
        <Sequence key={id} from={beat(id).from} durationInFrames={sceneLength(id)}>
          <Enter>
            <Scene />
          </Enter>
        </Sequence>
      ))}
      <AbsoluteFill className="grain pointer-events-none" style={{ opacity: 0.5 }} />
      <Caption />
      <Soundtrack music="audio/music.mp3" voice={BEATS.map((item) => ({ id: item.id, from: item.from, speechEnd: item.from + item.speechFrames }))} cues={CUES} durationInFrames={DURATION} duckedLevel={0.11} musicFrom={MUSIC_FROM} />
    </AbsoluteFill>
  );
}
