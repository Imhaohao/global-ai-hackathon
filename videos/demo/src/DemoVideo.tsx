import { AbsoluteFill } from "remotion";
import { AppShots } from "./app/AppShots";
import { AIRPLANE_SEED_FROM } from "./app/shots";
import { Grain } from "./components/Grain";
import { Motif } from "./components/Motif";
import { OverflowProbe } from "./components/OverflowProbe";
import { Close } from "./scenes/Close";
import { AirplaneMode } from "./scenes/AirplaneMode";
import { Intro } from "./scenes/Intro";
import { AppStage } from "./story/AppStage";
import { OfficerCard } from "./story/OfficerCard";
import { SmsScene } from "./story/SmsScene";
import { Soundtrack } from "./Soundtrack";
import { SCENES, cue } from "./timeline";

const MOTIF = [
  { from: cue("promise", "mode"), to: SCENES.intro.to, marks: ["airplane", "zeroInternet"] as const },
  { from: cue("scan", "zero"), to: SCENES.scan.to, marks: ["zeroInternet"] as const },
  { from: AIRPLANE_SEED_FROM, to: SCENES.seed.to, marks: ["airplane", "zeroInternet"] as const },
  { from: cue("sms", "internet"), to: cue("sms", "Just") - 2, marks: ["noData"] as const },
  { from: cue("sms", "Just"), to: cue("sms", "reply") - 10, marks: ["text"] as const },
].map((window) => ({ ...window, marks: [...window.marks] }));

/**
 * Leaf Doctor's demo: access first (100 farmers, the barriers, the photo pile), then the real app on an iPhone in
 * airplane mode, SMS on Noor's basic phone, the field officer, and everyone reached. Scenes gate themselves on the
 * absolute, voice-cued timeline.
 */
export function DemoVideo({ checkOverflow = false, overflowSelfTest = false }: { checkOverflow?: boolean; overflowSelfTest?: boolean }) {
  return (
    <AbsoluteFill className="bg-night">
      <Intro />
      <AirplaneMode />
      <AppStage />
      <AppShots />
      <SmsScene />
      <OfficerCard />
      <Motif windows={MOTIF} />
      <Close />
      <Grain />
      <Soundtrack />
      {checkOverflow && <OverflowProbe alwaysFail={overflowSelfTest} />}
    </AbsoluteFill>
  );
}
