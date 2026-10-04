import { CellSignalSlash, CheckCircle, Cloud, DeviceMobile, XCircle } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { ScanBar } from "../../../components/ScanBar";
import { ScreenshotPhone } from "../../../components/ScreenshotPhone";
import { Slab } from "../../../components/Slab";
import { Paper, Vignette } from "../../../components/Surface";
import { progress } from "../../../lib/ease";
import { SOURCES } from "../credits";
import { wordAt } from "../timeline";

const word = (text: string, occurrence = 0) => wordAt("small", text, occurrence);
const sizeFrom = word("at") - 6;
const contrastFrom = word("while") - 4;

const WORKS_WITHOUT_INTERNET = { top: 0.912, height: 0.032 } as const;

function Daughter({ length }: { length: number }) {
  return (
    <Punch flash={0.4}>
      <Photo src="images/daughter-scan.jpg" from={{ scale: 1.04 }} to={{ scale: 1.2 }} duration={length} origin="62% 38%" />
      <Vignette strength={0.4} />
      <div className="absolute inset-x-safe-side top-[240px]">
        <FinePrint at={8} tone="light">Noor's daughter, in a picture made with AI.</FinePrint>
      </div>
    </Punch>
  );
}

function ModelSize() {
  const frame = useCurrentFrame();
  const local = (text: string) => word(text) - sizeFrom;
  const phoneIn = progress(frame, 10, 16);
  const sweep = progress(frame, 18, 40, (t) => t);
  return (
    <Punch flash={0.4}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[150px] flex flex-col gap-2">
          <span className="display-poster text-figure figures text-ink">7.7 MB</span>
          <p className="text-lead font-bold">
            The leaf model, <span className="font-data">coffee-leaf.tflite</span>
          </p>
        </div>
        <div className="absolute left-1/2 top-[520px]" style={{ translate: `-50% ${(1 - phoneIn) * 500}px` }}>
          <div className="relative">
            <ScreenshotPhone src="images/screens/01-capture-empty.jpg" width={400} highlight={WORKS_WITHOUT_INTERNET} highlightOn={progress(frame, local("no"), 8)} />
            <div className="absolute inset-[14px] overflow-hidden rounded-[44px]">{sweep < 1 && <ScanBar at={sweep} />}</div>
          </div>
        </div>
      </Paper>
    </Punch>
  );
}

function Column({ icon: Glyph, title, status, works, at }: { icon: Icon; title: string; status: string; works: boolean; at: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  const Mark = works ? CheckCircle : XCircle;
  return (
    <Slab className="flex flex-1 flex-col items-start gap-6 px-8 py-12" style={{ opacity: shown, translate: `0 ${(1 - shown) * 40}px` }}>
      <Glyph size={120} weight="duotone" className={works ? "text-leaf" : "text-ink-muted"} />
      <p className="display-headline text-title">{title}</p>
      <p className="flex items-center gap-3 text-label font-bold">
        <Mark size={44} weight="fill" className={works ? "text-leaf" : "text-unclear"} />
        {status}
      </p>
    </Slab>
  );
}

function PhoneVersusCloud() {
  const local = (text: string) => word(text) - contrastFrom;
  return (
    <Punch flash={0.4}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[330px] flex flex-col gap-12">
          <div className="flex items-center gap-4 text-lead font-bold text-ink-muted">
            <CellSignalSlash size={56} weight="bold" /> No signal on the slope
          </div>
          <div className="flex gap-6">
            <Column icon={DeviceMobile} title="Leaf model" status="Runs on the phone" works at={2} />
            <Column icon={Cloud} title="Cloud model" status="Needs data" works={false} at={local("cloud")} />
          </div>
          <FinePrint at={20}>
            {SOURCES.leafModelSize.figure}. Desktop tests ran it with network access blocked; speed on a real phone is not measured yet. {SOURCES.leafModelSize.source}.
          </FinePrint>
        </div>
      </Paper>
    </Punch>
  );
}

export function SmallModelScene({ length }: { length: number }) {
  return (
    <>
      <Sequence durationInFrames={sizeFrom} layout="none">
        <Daughter length={sizeFrom} />
      </Sequence>
      <Sequence from={sizeFrom} durationInFrames={contrastFrom - sizeFrom} layout="none">
        <ModelSize />
      </Sequence>
      <Sequence from={contrastFrom} durationInFrames={length - contrastFrom} layout="none">
        <PhoneVersusCloud />
      </Sequence>
    </>
  );
}
