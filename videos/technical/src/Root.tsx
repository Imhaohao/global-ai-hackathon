import "./theme.css";
import "./fonts";
import { Composition } from "remotion";
import { DURATION, FPS, FRAME } from "./lib/timeline";
import { Technical } from "./Technical";

export function Root() {
  return <Composition id="Technical" component={Technical} durationInFrames={DURATION} fps={FPS} width={FRAME.width} height={FRAME.height} />;
}
