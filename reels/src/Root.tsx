import "./theme.css";
import "./fonts";
import { Composition } from "remotion";
import { FPS, REEL } from "./lib/timing";
import type { ReelSpec } from "./reels/registry";
import { DEMO_DURATION } from "./reels/demo/timeline";
import { DemoReel } from "./reels/demo/DemoReel";

const reels: ReelSpec[] = [{ id: "Demo", component: DemoReel, durationInFrames: DEMO_DURATION }];

export function Root() {
  return (
    <>
      {reels.map((reel) => (
        <Composition key={reel.id} id={reel.id} component={reel.component} durationInFrames={reel.durationInFrames} fps={FPS} width={REEL.width} height={REEL.height} />
      ))}
    </>
  );
}
