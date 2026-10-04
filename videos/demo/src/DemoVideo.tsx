import { AbsoluteFill } from "remotion";
import { Grain } from "./components/Grain";
import { OverflowProbe } from "./components/OverflowProbe";
import { Close } from "./scenes/Close";
import { Problem } from "./scenes/Problem";
import { Story } from "./story/Story";
import { Soundtrack } from "./Soundtrack";

/**
 * Leaf Doctor's demo: the access gap as 100 farmers, then Noor's basic phone carrying every feature in the order she
 * meets them, then everyone reached. Each scene gates itself on the absolute, voice-cued timeline.
 */
export function DemoVideo({ checkOverflow = false, overflowSelfTest = false }: { checkOverflow?: boolean; overflowSelfTest?: boolean }) {
  return (
    <AbsoluteFill className="bg-night">
      <Problem />
      <Story />
      <Close />
      <Grain />
      <Soundtrack />
      {checkOverflow && <OverflowProbe alwaysFail={overflowSelfTest} />}
    </AbsoluteFill>
  );
}
