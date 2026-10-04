import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { OverflowProbe } from "./components/OverflowProbe";
import { Soundtrack } from "./components/Soundtrack";
import { CUES } from "./cues";
import { progress } from "./lib/ease";
import { beat, BEATS, DURATION, sceneLength, type BeatId } from "./lib/timeline";
import { Close } from "./scenes/Close";
import { Hub } from "./scenes/Hub";
import { Officer } from "./scenes/Officer";
import { Problem } from "./scenes/Problem";
import { Race } from "./scenes/Race";
import { Scan } from "./scenes/Scan";
import { Tiny } from "./scenes/Tiny";

const SCENES: { id: BeatId; component: () => React.ReactNode }[] = [
  { id: "hub", component: Hub },
  { id: "tiny", component: Tiny },
  { id: "scan", component: Scan },
  { id: "race", component: Race },
  { id: "officer", component: Officer },
  { id: "close", component: Close },
];

/** Frame in the music track where its closing hit sits is lined up with the wordmark; see scripts/musicPrompt.ts. */
const MUSIC_FROM = 0;

/** Each scene arrives with a short push: a little large and soft, settling sharp in eight frames. */
function Enter({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const settle = progress(frame, 0, 8);
  return <AbsoluteFill style={{ opacity: settle, scale: String(1.04 - 0.04 * settle), filter: settle < 1 ? `blur(${(1 - settle) * 10}px)` : undefined }}>{children}</AbsoluteFill>;
}

/** Problem, explanation, solution: the flip phone texts the hub, why it is small, the weekend scan, the race, the officer. */
export function Technical() {
  return (
    <AbsoluteFill className="bg-night">
      <Sequence durationInFrames={beat("hub").from}>
        <Problem />
      </Sequence>
      {SCENES.map(({ id, component: Scene }) => (
        <Sequence key={id} from={beat(id).from} durationInFrames={sceneLength(id)}>
          <Enter>
            <Scene />
          </Enter>
        </Sequence>
      ))}
      <AbsoluteFill className="grain pointer-events-none" style={{ opacity: 0.5 }} />
      <OverflowProbe />
      <Soundtrack music="audio/music.mp3" voice={BEATS.map((item) => ({ id: item.id, from: item.from, speechEnd: item.from + item.speechFrames }))} cues={CUES} durationInFrames={DURATION} duckedLevel={0.11} musicFrom={MUSIC_FROM} />
    </AbsoluteFill>
  );
}
