import type { ComponentType } from "react";
import { Sequence } from "remotion";
import { Captions, toPhrases } from "../../components/Captions";
import { Soundtrack } from "../../components/Soundtrack";
import { Grain, Paper } from "../../components/Surface";
import { DEMO_CUES } from "./cues";
import { BarriersScene } from "./scenes/BarriersScene";
import { CloseScene } from "./scenes/CloseScene";
import { FlipScene } from "./scenes/FlipScene";
import { GapScene } from "./scenes/GapScene";
import { LocalScene } from "./scenes/LocalScene";
import { PhotoScene } from "./scenes/PhotoScene";
import { SmallModelScene } from "./scenes/SmallModelScene";
import { BEATS, DEMO_DURATION, sceneFrom, sceneLength, WORDS } from "./timeline";
import type { BeatId } from "./voiceover";

const SCENES: Record<BeatId, ComponentType<{ length: number }>> = {
  gap: GapScene,
  barriers: BarriersScene,
  small: SmallModelScene,
  flip: FlipScene,
  photo: PhotoScene,
  local: LocalScene,
  close: CloseScene,
};

const PHRASES = toPhrases(WORDS);

export function DemoReel() {
  return (
    <Paper>
      {BEATS.map(({ id }) => {
        const Scene = SCENES[id];
        const length = sceneLength(id);
        return (
          <Sequence key={id} from={sceneFrom(id)} durationInFrames={length} layout="none" name={id}>
            <Scene length={length} />
          </Sequence>
        );
      })}
      <Captions phrases={PHRASES} />
      <Grain strength={0.09} />
      <Soundtrack music="audio/music.mp3" voice={BEATS.map(({ id, from, speechEnd }) => ({ id, from, speechEnd }))} cues={DEMO_CUES} durationInFrames={DEMO_DURATION} />
    </Paper>
  );
}
