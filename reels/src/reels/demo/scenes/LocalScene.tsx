import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { ScreenshotPhone, type ScreenRegion } from "../../../components/ScreenshotPhone";
import { Slab } from "../../../components/Slab";
import { Spore } from "../../../components/Spore";
import { FloorShade, Paper } from "../../../components/Surface";
import { glide, mix, progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";
import { wordAt } from "../timeline";
import { NoorReads } from "./HubParts";

const word = (text: string, occurrence = 0) => wordAt("local", text, occurrence);
export const LOCAL_TIMING = { cardFrom: word("and") - 4, unsureFrom: word("and", 1) - 4, officerFrom: word("go") - 6 } as const;

const STEPS: ScreenRegion = { top: 0.31, height: 0.45 };
const SEND_BUTTON: ScreenRegion = { top: 0.928, height: 0.048 };
const OFFICER_PHONE = { x: 600, y: 760 } as const;

function RealScreen({ src, highlight, highlightAt, caption }: { src: string; highlight: ScreenRegion; highlightAt: number; caption: string }) {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, 14);
  return (
    <Punch flash={0.35}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[120px]">
          <FinePrint at={4}>{caption}</FinePrint>
        </div>
        <div className="absolute left-1/2 top-[190px]" style={{ translate: `-50% ${(1 - enter) * 500}px` }}>
          <ScreenshotPhone src={src} width={540} highlight={highlight} highlightOn={progress(frame, highlightAt, 8)} />
        </div>
      </Paper>
    </Punch>
  );
}

function Officer({ length }: { length: number }) {
  const frame = useCurrentFrame();
  const flight = progress(frame, 0, 18, glide);
  const bubble = progress(frame, 16, 12);
  return (
    <Punch flash={0.35}>
      <Photo src="images/officer.jpg" from={{ scale: 1.06 }} to={{ scale: 1.16 }} duration={length} origin={`${OFFICER_PHONE.x}px ${OFFICER_PHONE.y}px`} style={{ objectPosition: "45% 50%" }} />
      <FloorShade strength={0.55} from={42} />
      {flight < 1 && <Spore x={mix(120, OFFICER_PHONE.x, flight)} y={mix(-60, OFFICER_PHONE.y, flight)} size={mix(64, 30, flight)} />}
      <div className="absolute inset-x-safe-side top-[880px] flex flex-col gap-3" style={{ opacity: bubble, translate: `0 ${(1 - bubble) * 30}px` }}>
        <Slab className="flex flex-col gap-2 px-7 py-6">
          <p className="text-fineprint text-ink-muted">SMS to the extension officer</p>
          <p className="font-data text-ui">{productCopy.caseSummary}</p>
        </Slab>
        <FinePrint at={24} tone="light">Texts written in Kikuyu also go to a person, because the model cannot read Kikuyu yet. The officer is a picture made with AI.</FinePrint>
      </div>
    </Punch>
  );
}

export function LocalScene({ length }: { length: number }) {
  const { cardFrom, unsureFrom, officerFrom } = LOCAL_TIMING;
  return (
    <>
      <Sequence durationInFrames={cardFrom} layout="none">
        <NoorReads confirmAt={word("our") - 4} />
      </Sequence>
      <Sequence from={cardFrom} durationInFrames={unsureFrom - cardFrom} layout="none">
        <RealScreen src="images/screens/04-action-card-after-clear-plant.jpg" highlight={STEPS} highlightAt={word("steps") - cardFrom} caption="The app on an Android emulator, docs/screens." />
      </Sequence>
      <Sequence from={unsureFrom} durationInFrames={officerFrom - unsureFrom} layout="none">
        <RealScreen src="images/screens/07-action-card-needs-person.jpg" highlight={SEND_BUTTON} highlightAt={word("cases") - unsureFrom - 6} caption="When the leaves disagree, the app asks a person." />
      </Sequence>
      <Sequence from={officerFrom} durationInFrames={length - officerFrom} layout="none">
        <Officer length={length - officerFrom} />
      </Sequence>
    </>
  );
}
