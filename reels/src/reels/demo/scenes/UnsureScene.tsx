import { Sequence, useCurrentFrame } from "remotion";
import { Handset } from "../../../components/Handset";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Slab } from "../../../components/Slab";
import { Spore } from "../../../components/Spore";
import { FloorShade, Paper } from "../../../components/Surface";
import { glide, mix, progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";
import { wordAt } from "../timeline";
import { NotSureScreen } from "../ui/LeafAppScreens";

const word = (text: string) => wordAt("unsure", text);
export const OFFICER_FROM = word("sends") - 4;
const OFFICER_PHONE = { x: 600, y: 760 } as const;

function NotSure() {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, 14);
  return (
    <Punch flash={0.35}>
      <Paper>
        <div className="absolute left-1/2 top-[250px]" style={{ translate: `-50% ${(1 - enter) * 500}px` }}>
          <Handset width={680} height={1110}>
            <NotSureScreen moments={{ tapAt: word("tap") }} />
          </Handset>
        </div>
      </Paper>
    </Punch>
  );
}

function Officer({ length }: { length: number }) {
  const frame = useCurrentFrame();
  const flight = progress(frame, 0, 18, glide);
  const bubble = progress(frame, 18, 14);
  return (
    <Punch flash={0.35}>
      <Photo src="images/officer.jpg" from={{ scale: 1.06 }} to={{ scale: 1.16 }} duration={length} origin={`${OFFICER_PHONE.x}px ${OFFICER_PHONE.y}px`} style={{ objectPosition: "45% 50%" }} />
      <FloorShade strength={0.5} from={45} />
      {flight < 1 && <Spore x={mix(120, OFFICER_PHONE.x, flight)} y={mix(-60, OFFICER_PHONE.y, flight)} size={mix(64, 30, flight)} />}
      <div className="absolute inset-x-safe-side top-[930px]" style={{ opacity: bubble, translate: `0 ${(1 - bubble) * 30}px` }}>
        <Slab className="flex flex-col gap-2 px-7 py-6">
          <p className="text-fineprint text-ink-muted">SMS to the extension officer</p>
          <p className="font-data text-ui">{productCopy.caseSummary}</p>
        </Slab>
      </div>
    </Punch>
  );
}

export function UnsureScene({ length }: { length: number }) {
  return (
    <>
      <Sequence durationInFrames={OFFICER_FROM} layout="none">
        <NotSure />
      </Sequence>
      <Sequence from={OFFICER_FROM} durationInFrames={length - OFFICER_FROM} layout="none">
        <Officer length={length - OFFICER_FROM} />
      </Sequence>
    </>
  );
}
