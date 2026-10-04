import "./theme.css";
import "./fonts";
import { Composition } from "remotion";
import { DemoVideo } from "./DemoVideo";
import { DURATION, FPS, HEIGHT, WIDTH } from "./timeline";

export function Root() {
  return <Composition id="DemoVideo" component={DemoVideo} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />;
}
