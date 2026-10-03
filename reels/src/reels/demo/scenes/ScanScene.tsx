import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Handset } from "../../../components/Handset";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Paper, Vignette } from "../../../components/Surface";
import { progress } from "../../../lib/ease";
import { SOURCES } from "../credits";
import { wordAt } from "../timeline";
import { ActionCardScreen, CaptureScreen } from "../ui/LeafAppScreens";

const word = (text: string, occurrence = 0) => wordAt("scan", text, occurrence);

export const SCAN_TIMING = { captureFrom: 40, cardFrom: word("and") - 4, firstShotAt: 8, every: 10 } as const;

/** Sunday 4 October 2026 plus the card's seven-day recheck. */
export const RECHECK_DATE = "Sun 11 Oct";

function Daughter({ length }: { length: number }) {
  return (
    <Punch flash={0.4}>
      <Photo src="images/daughter-scan.jpg" from={{ scale: 1.04 }} to={{ scale: 1.2 }} duration={length} origin="62% 38%" />
      <Vignette strength={0.4} />
    </Punch>
  );
}

function PhoneStage({ children, fine }: { children: React.ReactNode; fine?: boolean }) {
  const frame = useCurrentFrame();
  const enter = progress(frame, 0, 16);
  return (
    <Punch flash={0.35}>
      <Paper>
        <div className="absolute inset-0 opacity-30">
          <Photo src="images/daughter-scan.jpg" from={{ scale: 1.3 }} to={{ scale: 1.36 }} duration={200} style={{ filter: "blur(18px)" }} />
        </div>
        {fine && (
          <div className="absolute inset-x-safe-side top-[120px]">
            <FinePrint at={20}>
              {SOURCES.leafModelTest.figure}. {SOURCES.leafModelTest.source}.
            </FinePrint>
          </div>
        )}
        <div className="absolute left-1/2 top-[250px]" style={{ translate: `-50% ${(1 - enter) * 500}px` }}>
          <Handset width={680} height={1110}>{children}</Handset>
        </div>
      </Paper>
    </Punch>
  );
}

export function ScanScene({ length }: { length: number }) {
  const { captureFrom, cardFrom } = SCAN_TIMING;
  const captureLocal = (text: string) => word(text) - captureFrom;
  const cardLocal = (text: string, occurrence = 0) => word(text, occurrence) - cardFrom;
  return (
    <>
      <Sequence durationInFrames={captureFrom} layout="none">
        <Daughter length={captureFrom} />
      </Sequence>
      <Sequence from={captureFrom} durationInFrames={cardFrom - captureFrom} layout="none">
        <PhoneStage>
          <CaptureScreen moments={{ firstShotAt: SCAN_TIMING.firstShotAt, every: SCAN_TIMING.every, offlineAt: captureLocal("offline") }} />
        </PhoneStage>
      </Sequence>
      <Sequence from={cardFrom} durationInFrames={length - cardFrom} layout="none">
        <PhoneStage fine>
          <ActionCardScreen
            recheckDate={RECHECK_DATE}
            moments={{ headlineAt: cardLocal("what"), stepsAt: cardLocal("what", 1), callAt: cardLocal("who"), recheckAt: cardLocal("check") }}
          />
        </PhoneStage>
      </Sequence>
    </>
  );
}
