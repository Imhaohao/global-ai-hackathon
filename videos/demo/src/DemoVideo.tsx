import { AbsoluteFill, Sequence } from "remotion";
import { Grain } from "./components/Grain";
import { Chaos } from "./scenes/Chaos";
import { Close } from "./scenes/Close";
import { EndCard } from "./scenes/EndCard";
import { Map } from "./scenes/Map";
import { Orbit } from "./scenes/Orbit";
import { Scan } from "./scenes/Scan";
import { Seed } from "./scenes/Seed";
import { Shop } from "./scenes/Shop";
import { Sms } from "./scenes/Sms";
import { Soundtrack } from "./Soundtrack";
import { SCENES, type SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, () => React.ReactNode> = {
  orbit: Orbit,
  chaos: Chaos,
  scan: Scan,
  sms: Sms,
  shop: Shop,
  seed: Seed,
  map: Map,
  close: Close,
  endCard: EndCard,
};

/** Leaf Doctor's 55-second demo: the access gap, then every feature in the order a farmer meets them. */
export function DemoVideo() {
  return (
    <AbsoluteFill className="bg-night">
      {(Object.keys(SCENES) as SceneId[]).map((id) => {
        const Scene = SCENE_COMPONENTS[id];
        return (
          <Sequence key={id} name={id} from={SCENES[id].from} durationInFrames={SCENES[id].to - SCENES[id].from}>
            <Scene />
          </Sequence>
        );
      })}
      <Grain />
      <Soundtrack />
    </AbsoluteFill>
  );
}
