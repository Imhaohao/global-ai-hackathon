import { Bell, ChatText, CheckCircle, CloudRain, Cpu, DeviceMobileSpeaker, Leaf, MapPin, PaperPlaneTilt, Phone, Question } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Envelope } from "../components/Envelope";
import { leave, progress } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const OFFICER = { x: 1460, y: 420 };

/** An app button with the app's own label, pressed once: scale 0.96 and a ripple. */
function TapButton({ label, icon: Glyph, at, tapAt, exitAt }: { label: string; icon: Icon; at: number; tapAt: number; exitAt: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 10) - progress(frame, exitAt, 10, leave);
  const press = frame >= tapAt && frame < tapAt + 6 ? 0.96 : 1;
  const ripple = progress(frame, tapAt, 18);
  return (
    <div data-box="button" className="relative flex h-[110px] w-[760px] items-center justify-center gap-5 whitespace-nowrap rounded-full bg-leaf text-paper-raised" style={{ opacity: shown, scale: String(press), boxShadow: "0 20px 50px rgb(0 0 0 / 0.5)" }}>
      <Glyph size={46} weight="bold" />
      <span className="text-headline font-bold">{label}</span>
      {ripple > 0 && ripple < 1 && <span className="absolute size-[110px] rounded-full bg-paper-raised" style={{ opacity: 0.35 * (1 - ripple), scale: String(1 + ripple * 5) }} />}
    </div>
  );
}

const SUMMARY_ICONS: Icon[] = [Leaf, MapPin, CloudRain, Cpu];

/** The case summary text: verdict, GPS, rain and model version, as caseSummary.ts writes it. */
function SummaryCard({ at, exitAt }: { at: number; exitAt: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 12) - progress(frame, exitAt, 10, leave);
  return (
    <div data-box="summary" className="absolute left-[860px] top-[640px] w-[420px] rounded-lg bg-lcd p-7" style={{ opacity: shown, translate: `0 ${(1 - progress(frame, at, 12)) * 40}px` }}>
      <p className="text-lead font-bold text-lcd-ink">Case summary</p>
      <div className="mt-5 flex gap-6 text-lcd-ink">
        {SUMMARY_ICONS.map((Glyph, index) => (
          <Glyph key={index} size={56} weight="bold" style={{ opacity: progress(frame, at + 6 + index * 4, 8) }} />
        ))}
      </div>
    </div>
  );
}

function OfficerBadge({ ringAt, ringUntil, x, y }: { ringAt: number; ringUntil: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  const ringing = frame >= ringAt && frame < ringUntil;
  return (
    <div className="absolute" style={{ left: x, top: y }}>
      {ringing &&
        [0, 1, 2].map((wave) => {
          const t = ((frame - ringAt + wave * 8) % 24) / 24;
          return <span key={wave} className="absolute left-1/2 top-1/2 size-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ boxShadow: "0 0 0 3px var(--color-live)", opacity: 1 - t, scale: String(1 + t * 0.9) }} />;
        })}
      <div className="relative size-[240px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full" style={{ boxShadow: "0 0 0 4px var(--color-live), 0 0 90px color-mix(in srgb, var(--color-live) 30%, transparent)" }}>
        <Img src={staticFile("media/officer-portrait.jpg")} className="size-full object-cover" />
      </div>
      {ringing && (
        <div className="absolute flex size-[84px] items-center justify-center rounded-full bg-live text-night" style={{ left: 60, top: -150 }}>
          <Phone size={48} weight="fill" />
        </div>
      )}
      <p className="absolute w-[400px] -translate-x-1/2 text-center display-headline text-title text-text" style={{ top: 140 }}>
        Field officer
      </p>
    </div>
  );
}

const NEIGHBOURS = 8;

function AlertFanOut({ at, approveAt }: { at: number; approveAt: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at + 12, 12);
  const approved = progress(frame, approveAt, 8);
  return (
    <AbsoluteFill style={{ opacity: shown }}>
      <div data-box="alert" className="absolute left-[420px] top-[220px] w-[620px] rounded-lg bg-night-high p-8" style={{ boxShadow: "0 0 0 2px var(--color-night-line)" }}>
        <p className="flex items-center gap-4 whitespace-nowrap text-headline font-bold text-text">
          <Bell size={56} weight="fill" className="text-rust-glow" /> Outbreak alert
        </p>
        <div data-box="approve" className="mt-8 flex h-[90px] w-[300px] items-center justify-center gap-4 rounded-full bg-leaf text-paper-raised" style={{ scale: String(frame >= approveAt && frame < approveAt + 6 ? 0.96 : 1) }}>
          {approved > 0.5 ? <CheckCircle size={44} weight="fill" /> : <PaperPlaneTilt size={44} weight="bold" />}
          <span className="text-lead font-bold">Approve</span>
        </div>
      </div>
      {Array.from({ length: NEIGHBOURS }, (_, index) => {
        const lit = progress(frame, approveAt + 14 + index * 3, 8);
        const x = 240 + index * 200;
        return (
          <div key={index} className="absolute flex flex-col items-center" style={{ left: x, top: 820, color: lit > 0.5 ? "var(--color-live)" : "var(--color-text-faint)", filter: lit > 0.5 ? "drop-shadow(0 0 18px var(--color-live))" : "none" }}>
            {lit > 0.5 ? <ChatText size={56} weight="fill" /> : <DeviceMobileSpeaker size={56} weight="bold" />}
          </div>
        );
      })}
      {Array.from({ length: NEIGHBOURS }, (_, index) => (
        <Envelope key={index} from={{ x: 730, y: 420 }} to={{ x: 268 + index * 200, y: 848 }} at={approveAt + 2 + index * 3} duration={14} arc={-60} />
      ))}
    </AbsoluteFill>
  );
}

/** Solution to "few officers": one tap sends the officer a case summary or calls; outbreak alerts need an officer's yes. */
export function Officer() {
  const frame = useCurrentFrame();
  const sendAt = wordAt("officer", "one") - 10;
  const tapAt = wordAt("officer", "tap");
  const callAt = wordAt("officer", "calls") - 10;
  const alertAt = wordAt("officer", "Officers") - 8;
  const approveAt = wordAt("officer", "approve") + 4;
  const unsure = progress(frame, 0, 10) - progress(frame, alertAt, 10, leave);
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute left-[140px] top-[200px] flex items-center gap-6 text-rust-glow" style={{ opacity: unsure }}>
        <Question size={110} weight="bold" />
        <span className="display-headline text-figure">Not sure</span>
      </div>
      <div className="absolute left-[140px] top-[480px]">
        <TapButton label="Send to field officer" icon={PaperPlaneTilt} at={sendAt} tapAt={tapAt} exitAt={callAt - 14} />
      </div>
      <div className="absolute left-[140px] top-[480px]">
        {frame >= callAt - 4 && <TapButton label="Call your field officer" icon={Phone} at={callAt - 4} tapAt={callAt + 6} exitAt={alertAt} />}
      </div>
      <SummaryCard at={tapAt + 4} exitAt={callAt - 8} />
      <Envelope from={{ x: 760, y: 535 }} to={{ x: OFFICER.x, y: OFFICER.y }} at={tapAt + 18} duration={22} />
      <OfficerBadge ringAt={callAt + 6} ringUntil={alertAt + 14} x={OFFICER.x} y={OFFICER.y} />
      {frame >= alertAt && <AlertFanOut at={alertAt} approveAt={approveAt} />}
    </AbsoluteFill>
  );
}
