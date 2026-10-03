import { CheckCircle } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { FeaturePhone, LcdStatus } from "../../../components/FeaturePhone";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Spore } from "../../../components/Spore";
import { Vignette } from "../../../components/Surface";
import { glide, leave, mix, progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";

export const TEXT_TIMING = { phoneIn: 16, typeFrom: 30, typeUntil: 104, sentAt: 108, launchAt: 112 } as const;

const MESSAGE = productCopy.noorMessage;

const KEY_FOR_LETTER: Record<string, string> = {
  a: "2", b: "2", c: "2", d: "3", e: "3", f: "3", g: "4", h: "4", i: "4", j: "5", k: "5", l: "5",
  m: "6", n: "6", o: "6", p: "7", q: "7", r: "7", s: "7", t: "8", u: "8", v: "8", w: "9", x: "9", y: "9", z: "9", " ": "0",
};

export function typedCount(frame: number) {
  const share = progress(frame, TEXT_TIMING.typeFrom, TEXT_TIMING.typeUntil - TEXT_TIMING.typeFrom, (t) => t);
  return Math.round(share * MESSAGE.length);
}

function Composer({ frame }: { frame: number }) {
  const typed = typedCount(frame);
  const cursorOn = Math.floor(frame / 8) % 2 === 0;
  const sent = frame >= TEXT_TIMING.sentAt;
  return (
    <div className="flex h-full flex-col">
      <LcdStatus label={sent ? "Sent" : "New message"} />
      <div className="mx-3 mt-2 border-b-2 border-lcd-ink/40 pb-1 text-sms-status font-bold">To: Cooperative</div>
      <p className="font-data px-3 pt-2 text-sms">
        {MESSAGE.slice(0, typed)}
        {!sent && <span className="inline-block h-[26px] w-[3px] translate-y-[4px] bg-lcd-ink" style={{ opacity: cursorOn ? 1 : 0 }} />}
      </p>
      {sent && (
        <div className="mt-auto flex items-center gap-2 px-3 pb-3 text-sms-status font-bold">
          <CheckCircle size={26} weight="fill" /> Message sent
        </div>
      )}
    </div>
  );
}

function LaunchedText({ frame }: { frame: number }) {
  const flight = progress(frame, TEXT_TIMING.launchAt, 24, glide);
  if (flight <= 0 || flight >= 1) return null;
  return <Spore x={mix(540, 700, flight)} y={mix(300, -120, flight)} size={mix(30, 60, flight)} />;
}

export function TextScene() {
  const frame = useCurrentFrame();
  const rise = progress(frame, TEXT_TIMING.phoneIn, 18);
  const blur = 12 * progress(frame, 10, 20);
  const lift = progress(frame, TEXT_TIMING.launchAt, 20, leave);
  const typed = typedCount(frame);
  const typing = frame >= TEXT_TIMING.typeFrom && frame < TEXT_TIMING.typeUntil;
  const pressedKey = typing && frame % 3 !== 2 ? KEY_FOR_LETTER[MESSAGE[Math.max(0, typed - 1)]?.toLowerCase() ?? " "] : undefined;
  return (
    <Punch flash={0.5}>
      <Photo src="images/noor-phone.jpg" from={{ scale: 1.05 }} to={{ scale: 1.18 }} duration={140} origin="52% 35%" style={{ filter: `blur(${blur}px) brightness(${1 - 0.4 * progress(frame, 10, 20)})` }} />
      <Vignette strength={0.5} />
      <div className="absolute left-1/2 top-[240px]" style={{ translate: `-50% ${(1 - rise) * 1100 - lift * 60}px`, scale: String(1.08 - 0.04 * lift) }}>
        <FeaturePhone pressedKey={pressedKey} glow={progress(frame, TEXT_TIMING.sentAt, 6) * (1 - progress(frame, TEXT_TIMING.sentAt + 10, 14))}>
          <Composer frame={frame} />
        </FeaturePhone>
      </div>
      <LaunchedText frame={frame} />
    </Punch>
  );
}
