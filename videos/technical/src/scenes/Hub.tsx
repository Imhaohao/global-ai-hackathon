import { CellSignalSlash, CheckCircle, Cpu, Leaf } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Camera } from "../components/Camera";
import { Envelope } from "../components/Envelope";
import { FLIP, FLIP_PARTS, FlipPhone, keyForLetter } from "../components/FlipPhone";
import { HUB } from "../data/facts";
import { leave, progress } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const PHONE = { left: 260, top: 140 };
const HUB_BOX = { left: 1420, top: 200, width: 330, height: 680 };
const REPLY = "Huenda ni Kutu ya majani ya kahawa…";
const TYPE_FROM = 4;
const CHARS_PER_FRAME = 1;
const TYPED_BY = TYPE_FROM + Math.ceil(HUB.swahili.length / CHARS_PER_FRAME);
const typedCount = (frame: number) => Math.max(0, Math.floor((frame - TYPE_FROM) * CHARS_PER_FRAME));

const onPhone = (part: { x: number; y: number }) => ({ x: PHONE.left + part.x, y: PHONE.top + part.y });

function Lcd({ replyAt }: { replyAt: number }) {
  const frame = useCurrentFrame();
  const typed = HUB.swahili.slice(0, typedCount(frame));
  const sent = progress(frame, TYPED_BY + 6, 8);
  const reply = progress(frame, replyAt, 8);
  if (reply > 0) {
    return <p className="font-data text-lcd text-lcd-ink" style={{ opacity: reply }}>{REPLY}</p>;
  }
  return (
    <div className="relative size-full">
      <p className="font-data text-lcd text-lcd-ink" style={{ opacity: 1 - sent }}>
        {typed}
        <span style={{ opacity: Math.floor(frame / 8) % 2 }}>▌</span>
      </p>
      <CheckCircle size={90} weight="fill" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lcd-ink" style={{ opacity: sent }} />
    </div>
  );
}

function HubPhone({ offlineAt }: { offlineAt: number }) {
  const frame = useCurrentFrame();
  const offline = progress(frame, offlineAt, 12);
  return (
    <div data-box="hub" className="absolute rounded-[48px] p-[14px]" style={{ ...HUB_BOX, background: "linear-gradient(160deg, var(--color-handset-high), var(--color-handset-low))", boxShadow: "inset 0 2px 0 rgb(255 255 255 / 0.12), 0 40px 80px rgb(0 0 0 / 0.55)" }}>
      <div className="relative size-full overflow-hidden rounded-[34px] bg-night-raised">
        <div className="absolute left-1/2 top-[18px] size-[16px] -translate-x-1/2 rounded-full bg-black" />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="absolute left-[24px] h-[54px] rounded-md bg-night-high" style={{ top: 70 + row * 72, width: 220 - row * 30 }} />
        ))}
        <div className="absolute inset-x-0 bottom-[60px] flex flex-col items-center gap-3 text-rust-glow" style={{ opacity: offline }}>
          <CellSignalSlash size={90} weight="bold" />
          <span className="text-label font-bold">Offline</span>
        </div>
      </div>
    </div>
  );
}

function Pipeline({ chipAt, fieldsAt, ruleAt }: { chipAt: number; fieldsAt: number; ruleAt: number }) {
  const frame = useCurrentFrame();
  const card = (start: number) => ({ opacity: progress(frame, start, 12), translate: `${(1 - progress(frame, start, 12)) * 60}px 0` });
  return (
    <div className="absolute left-[700px] top-[250px] flex w-[680px] flex-col gap-8">
      <div data-box="qwen" className="flex items-center gap-5 rounded-lg bg-night-high px-7 py-5" style={{ ...card(chipAt), boxShadow: "0 0 0 2px var(--color-live)" }}>
        <Cpu size={60} weight="bold" className="text-live" />
        <span className="whitespace-nowrap font-data text-headline text-text">{HUB.model}</span>
      </div>
      <div data-box="json" className="whitespace-nowrap rounded-lg bg-black/60 px-7 py-5 font-data text-label text-live" style={card(fieldsAt)}>
        <p>{'"topic": "leaf_symptoms"'}</p>
        <p>{'"sprayProduct": "not_mentioned"'}</p>
      </div>
      <div className="flex items-center gap-5" style={card(ruleAt)}>
        <Leaf size={80} weight="fill" style={{ color: "var(--color-rust-class)" }} />
        <span className="display-headline text-figure text-text">Rust?</span>
      </div>
    </div>
  );
}

/** Explanation: the flip phone texts the cooperative hub, which reads the Swahili offline and asks before it answers. */
export function Hub() {
  const frame = useCurrentFrame();
  const sendAt = Math.max(wordAt("hub", "hub") - 10, TYPED_BY + 8);
  const offlineAt = wordAt("hub", "offline");
  const chipAt = wordAt("hub", "Kwen") - 4;
  const fieldsAt = wordAt("hub", "reads") - 2;
  const ruleAt = wordAt("hub", "then") - 4;
  const replyAt = wordAt("hub", "confirm") - 6;
  const keypad = onPhone(FLIP_PARTS.keypad);
  const lcd = onPhone(FLIP_PARTS.lcd);
  const typing = typedCount(frame) - 1;
  const litKey = typing >= 0 && frame < TYPED_BY && HUB.swahili[typing] !== " " ? keyForLetter(HUB.swahili[typing]) : undefined;
  const middleOut = progress(frame, replyAt - 26, 10, leave);
  return (
    <AbsoluteFill className="bg-night">
      <Camera
        shots={[
          { at: 0, x: keypad.x, y: keypad.y - 40, scale: 1.9 },
          { at: 14, x: keypad.x, y: keypad.y - 60, scale: 1.8 },
          { at: 30, x: PHONE.left + FLIP.width / 2, y: 470, scale: 1.3 },
          { at: sendAt, x: PHONE.left + FLIP.width / 2, y: 520, scale: 1.2 },
          { at: sendAt + 26, x: 960, y: 540, scale: 1 },
          { at: chipAt, x: 960, y: 540, scale: 1 },
          { at: chipAt + 20, x: 1180, y: 520, scale: 1.18 },
          { at: replyAt - 20, x: 1180, y: 520, scale: 1.18 },
          { at: replyAt + 8, x: lcd.x, y: lcd.y + 10, scale: 2.5 },
        ]}
      >
        <div className="absolute" style={{ left: PHONE.left, top: PHONE.top }}>
          <FlipPhone screen={<Lcd replyAt={replyAt} />} litKey={litKey} />
        </div>
        <HubPhone offlineAt={offlineAt} />
        <div style={{ opacity: 1 - middleOut }}>
          <Pipeline chipAt={chipAt} fieldsAt={fieldsAt} ruleAt={ruleAt} />
        </div>
        <Envelope from={{ x: lcd.x, y: lcd.y }} to={{ x: 1585, y: 420 }} at={sendAt} />
        <Envelope from={{ x: 1585, y: 420 }} to={{ x: lcd.x, y: lcd.y }} at={replyAt - 24} duration={22} />
      </Camera>
    </AbsoluteFill>
  );
}
