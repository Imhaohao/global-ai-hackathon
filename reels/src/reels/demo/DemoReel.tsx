import type { ComponentType } from "react";
import { Sequence } from "remotion";
import { Captions, toPhrases } from "../../components/Captions";
import { Soundtrack } from "../../components/Soundtrack";
import { Grain, Paper } from "../../components/Surface";
import { DEMO_CUES } from "./cues";
import { CloseScene } from "./scenes/CloseScene";
import { GuardrailScene } from "./scenes/GuardrailScene";
import { HookScene } from "./scenes/HookScene";
import { HubScene } from "./scenes/HubScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { ScaleScene } from "./scenes/ScaleScene";
import { ScanScene } from "./scenes/ScanScene";
import { TextScene } from "./scenes/TextScene";
import { UnsureScene } from "./scenes/UnsureScene";
import { BEATS, DEMO_DURATION, sceneFrom, sceneLength, WORDS } from "./timeline";
import type { BeatId } from "./voiceover";

const SCENES: Record<BeatId, ComponentType<{ length: number }>> = {
  hook: HookScene,
  problem: ProblemScene,
  text: TextScene,
  hub: HubScene,
  scan: ScanScene,
  unsure: UnsureScene,
  guardrail: GuardrailScene,
  scale: ScaleScene,
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
