import { CheckCircle, CloudArrowUp } from "@phosphor-icons/react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { FeaturePhone, LcdStatus } from "../../../components/FeaturePhone";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Slab } from "../../../components/Slab";
import { Spore } from "../../../components/Spore";
import { Vignette } from "../../../components/Surface";
import { glide, mix, progress } from "../../../lib/ease";
import { wordAt } from "../timeline";

const word = (text: string) => wordAt("photo", text);
export const PHOTO_TIMING = { attachAt: word("pictures") - 4, sentAt: word("photo") + 6 } as const;

const CLOUD = { x: 540, y: 300 } as const;

function PictureMessage({ frame }: { frame: number }) {
  const attached = progress(frame, PHOTO_TIMING.attachAt, 10);
  const sent = frame >= PHOTO_TIMING.sentAt;
  return (
    <div className="flex h-full flex-col">
      <LcdStatus label={sent ? "Sent" : "Picture message"} />
      <div className="mx-3 mt-2 border-b-2 border-lcd-ink/40 pb-1 text-sms-status font-bold">To: Leaf Doctor</div>
      <div className="flex flex-1 items-center gap-3 px-3" style={{ opacity: attached }}>
        <Img src={staticFile("images/rust-topside.jpg")} className="h-[150px] w-[150px] object-cover grayscale-[35%]" style={{ objectPosition: "80% 45%" }} />
        <span className="font-data text-sms">leaf.jpg</span>
      </div>
      {sent && (
        <div className="flex items-center gap-2 px-3 pb-3 text-sms-status font-bold">
          <CheckCircle size={26} weight="fill" /> Message sent
        </div>
      )}
    </div>
  );
}

function Upload({ frame }: { frame: number }) {
  const flight = progress(frame, PHOTO_TIMING.sentAt, 22, glide);
  if (flight <= 0 || flight >= 1) return null;
  return <Spore x={CLOUD.x} y={mix(760, CLOUD.y + 60, flight)} size={mix(30, 56, flight)} />;
}

export function PhotoScene() {
  const frame = useCurrentFrame();
  const rise = progress(frame, 0, 16);
  const cloudIn = progress(frame, word("through") - 6, 14);
  return (
    <Punch flash={0.4}>
      <Photo src="images/noor-phone.jpg" from={{ scale: 1.25 }} to={{ scale: 1.32 }} duration={180} origin="52% 35%" style={{ filter: "blur(14px) brightness(0.5)" }} />
      <Vignette strength={0.5} />
      <div className="absolute left-1/2 top-[560px]" style={{ translate: `-50% ${(1 - rise) * 900}px`, scale: "1.05" }}>
        <FeaturePhone glow={progress(frame, PHOTO_TIMING.sentAt, 6) * (1 - progress(frame, PHOTO_TIMING.sentAt + 10, 14))}>
          <PictureMessage frame={frame} />
        </FeaturePhone>
      </div>
      <Upload frame={frame} />
      <div className="absolute inset-x-safe-side top-[140px] flex flex-col items-center gap-4" style={{ opacity: cloudIn, translate: `0 ${(1 - cloudIn) * -20}px` }}>
        <Slab className="flex items-center gap-4 px-8 py-5">
          <CloudArrowUp size={64} weight="duotone" className="text-leaf" />
          <span className="display-headline text-title">Online backend</span>
        </Slab>
        <FinePrint at={word("online")} tone="light" className="text-center">
          Photos go to our online backend, where Claude reads them, so this path needs a signal. Text answers from the hub phone do not.
        </FinePrint>
      </div>
    </Punch>
  );
}
