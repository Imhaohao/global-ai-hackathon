import { CheckCircle, WifiHigh, WifiSlash, type Icon } from "@phosphor-icons/react";
import { Sequence, useCurrentFrame } from "remotion";
import { FeaturePhone, LcdStatus } from "../../../components/FeaturePhone";
import { FinePrint } from "../../../components/FinePrint";
import { Handset } from "../../../components/Handset";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Slab } from "../../../components/Slab";
import { Spore } from "../../../components/Spore";
import { FloorShade, Paper, Vignette } from "../../../components/Surface";
import { glide, mix, progress } from "../../../lib/ease";
import { SOURCES } from "../credits";
import productCopy from "../productCopy.json";
import { wordAt } from "../timeline";
import { HubScreen } from "../ui/HubScreen";

const HUB_PHONE_IN_PHOTO = { x: 976, y: 1204 } as const;
export const ARRIVAL_FRAMES = 30;

const word = (text: string) => wordAt("hub", text);
export const HUB_UI_FROM = 44;
export const NOOR_REPLY_FROM = word("that") - 14;

function Arrival({ length }: { length: number }) {
  const frame = useCurrentFrame();
  const flight = progress(frame, 0, ARRIVAL_FRAMES, glide);
  const landed = progress(frame, ARRIVAL_FRAMES, 14);
  return (
    <Punch flash={0.3}>
      <Photo src="images/cooperative-hub.jpg" from={{ scale: 1.0 }} to={{ scale: 1.3 }} duration={length} origin={`${HUB_PHONE_IN_PHOTO.x}px ${HUB_PHONE_IN_PHOTO.y}px`} style={{ objectPosition: "75% 50%" }} />
      <Vignette strength={0.45} />
      {flight < 1 && <Spore x={mix(380, HUB_PHONE_IN_PHOTO.x, flight)} y={mix(-80, HUB_PHONE_IN_PHOTO.y, flight)} size={mix(70, 34, flight)} />}
      {landed > 0 && <Spore x={HUB_PHONE_IN_PHOTO.x} y={HUB_PHONE_IN_PHOTO.y} size={40 + 260 * landed} opacity={1 - landed} />}
    </Punch>
  );
}

function PathChip({ icon: Glyph, label, active }: { icon: Icon; label: string; active: boolean }) {
  return (
    <Slab
      className="flex items-center gap-3 px-6 py-4 text-label font-bold"
      style={{ opacity: active ? 1 : 0.42, boxShadow: active ? "0 0 0 4px var(--brand-leaf), 0 18px 50px rgba(16,18,14,0.28)" : undefined }}
    >
      <Glyph size={40} weight="bold" className={active ? "text-leaf" : "text-ink-muted"} />
      {label}
      {active && <CheckCircle size={36} weight="fill" className="text-leaf" />}
    </Slab>
  );
}

function HubUi({ local }: { local: (text: string) => number }) {
  const frame = useCurrentFrame();
  const offline = frame >= local("or");
  const enter = progress(frame, 0, 18);
  return (
    <Punch flash={0.4}>
      <Paper>
        <div className="absolute inset-0 opacity-25">
          <Photo src="images/cooperative-hub.jpg" from={{ scale: 1.3 }} to={{ scale: 1.36 }} duration={200} style={{ filter: "blur(16px)", objectPosition: "75% 50%" }} />
        </div>
        <div className="absolute inset-x-0 top-[120px] flex justify-center gap-5">
          <PathChip icon={WifiHigh} label="Online: Claude" active={!offline} />
          <PathChip icon={WifiSlash} label="Offline: on this phone" active={offline} />
        </div>
        <div className="absolute left-1/2 top-[250px]" style={{ translate: `-50% ${(1 - enter) * 600}px` }}>
          <Handset width={680} height={1110}>
            <HubScreen moments={{ exchangeAt: 6, offlineAt: local("or"), modelAt: local("small") - 4, replyAt: local("small") + 2, confirmAt: local("confirm") }} />
          </Handset>
        </div>
      </Paper>
    </Punch>
  );
}

const SMS = productCopy.hubSms;
const CONFIRM_SENTENCE = "Jibu ukieleza unachoona ili tuhakikishe.";
/** How far the long reply scrolls on the small screen so its last sentence and the opt-out line are in view. */
const LCD_SCROLL = 500;

function ReplyOnLcd({ frame, confirmAt }: { frame: number; confirmAt: number }) {
  const scroll = progress(frame, 16, 30, glide);
  const [before, after] = SMS.split(CONFIRM_SENTENCE);
  const lit = progress(frame, confirmAt, 8);
  return (
    <div className="flex h-full flex-col">
      <LcdStatus label="Message" />
      <div className="relative flex-1 overflow-hidden">
        <p className="font-data px-3 pt-2 text-sms" style={{ translate: `0 ${-LCD_SCROLL * scroll}px` }}>
          {before}
          <span style={{ background: `color-mix(in srgb, var(--brand-rust-glow) ${55 * lit}%, transparent)`, boxShadow: `0 0 ${16 * lit}px color-mix(in srgb, var(--brand-rust) ${50 * lit}%, transparent)` }}>{CONFIRM_SENTENCE}</span>
          {after}
        </p>
      </div>
    </div>
  );
}

function NoorReads({ confirmAt }: { confirmAt: number }) {
  const frame = useCurrentFrame();
  const english = progress(frame, confirmAt - 4, 14);
  return (
    <Punch flash={0.4}>
      <Photo src="images/noor-phone.jpg" from={{ scale: 1.2 }} to={{ scale: 1.26 }} duration={80} origin="52% 35%" style={{ filter: "blur(12px) brightness(0.55)" }} />
      <div className="absolute left-1/2 top-[110px] origin-top" style={{ translate: "-50% 0", scale: String(1.7 - 0.04 * progress(frame, 0, 60)) }}>
        <FeaturePhone glow={1 - progress(frame, 0, 20)}>
          <ReplyOnLcd frame={frame} confirmAt={confirmAt} />
        </FeaturePhone>
      </div>
      <FloorShade strength={0.95} from={32} />
      <div className="absolute inset-x-safe-side top-[930px]" style={{ opacity: english, translate: `0 ${(1 - english) * 24}px` }}>
        <Slab className="flex flex-col gap-3 px-7 py-6">
          <p className="text-fineprint text-ink-muted">The same reply in the English wording</p>
          <p className="text-lead font-bold">{productCopy.englishConfirmLine}</p>
          <FinePrint at={confirmAt + 6}>
            {SOURCES.hubModelTest.figure}. {SOURCES.hubModelTest.source}.
          </FinePrint>
        </Slab>
      </div>
    </Punch>
  );
}

export function HubScene({ length }: { length: number }) {
  const uiLocal = (text: string) => word(text) - HUB_UI_FROM;
  return (
    <>
      <Sequence durationInFrames={HUB_UI_FROM} layout="none">
        <Arrival length={HUB_UI_FROM} />
      </Sequence>
      <Sequence from={HUB_UI_FROM} durationInFrames={NOOR_REPLY_FROM - HUB_UI_FROM} layout="none">
        <HubUi local={uiLocal} />
      </Sequence>
      <Sequence from={NOOR_REPLY_FROM} durationInFrames={length - NOOR_REPLY_FROM} layout="none">
        <NoorReads confirmAt={word("confirm") - NOOR_REPLY_FROM} />
      </Sequence>
    </>
  );
}
