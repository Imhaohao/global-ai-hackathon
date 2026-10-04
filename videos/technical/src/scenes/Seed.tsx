import { Barcode, ChatText, CheckCircle, Prohibit, Question } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PartHeading } from "../components/PartHeading";
import { Phone } from "../components/Phone";
import { glide, progress } from "../lib/ease";

const OUTCOMES: { icon: Icon; title: string; note: string; colour: string }[] = [
  { icon: CheckCircle, title: "Genuine seed", note: "Plant it and keep the receipt", colour: "var(--color-live)" },
  { icon: Prohibit, title: "Recalled lot", note: "Do not plant; take it back", colour: "var(--brand-state-unclear-soft)" },
  { icon: Question, title: "Unknown code", note: "Never called fake: check the code", colour: "var(--color-text-muted)" },
];

function StateMachine() {
  const frame = useCurrentFrame();
  const wire = progress(frame, 8, 18, glide);
  const final = progress(frame, 40, 14);
  return (
    <div className="absolute left-[96px] top-[200px] w-[1150px]">
      <div className="flex w-[330px] items-center gap-4 rounded-lg bg-night-high px-6 py-5" style={{ opacity: progress(frame, 0, 10) }}>
        <Barcode size={48} weight="bold" className="text-text" />
        <div>
          <p className="text-label font-bold text-text">Scan packet barcode</p>
          <p className="text-fineprint text-text-faint">Demo registry, not live KEPHIS data</p>
        </div>
      </div>
      <svg className="absolute left-0 top-0" width={1150} height={600}>
        {OUTCOMES.map((outcome, index) => (
          <path key={outcome.title} d={`M 330 52 C 400 52, 400 ${52 + index * 150}, 470 ${52 + index * 150}`} fill="none" stroke="var(--color-text-faint)" strokeWidth={2.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - wire} />
        ))}
      </svg>
      {OUTCOMES.map((outcome, index) => {
        const shown = progress(frame, 14 + index * 6, 12);
        const Glyph = outcome.icon;
        return (
          <div key={outcome.title} className="absolute flex w-[520px] items-center gap-4" style={{ left: 480, top: index * 150, opacity: shown, translate: `${(1 - shown) * 30}px 0` }}>
            <Glyph size={56} weight="fill" style={{ color: outcome.colour }} />
            <div>
              <p className="text-lead font-bold text-text">{outcome.title}</p>
              <p className="text-label text-text-muted">{outcome.note}</p>
            </div>
          </div>
        );
      })}
      <div className="absolute left-0 top-[470px] flex w-[1000px] items-center gap-6 rounded-lg bg-night-high px-8 py-6" style={{ opacity: final, translate: `0 ${(1 - final) * 24}px`, boxShadow: "0 0 0 2px var(--color-live)" }}>
        <ChatText size={56} weight="bold" className="text-live" />
        <div>
          <p className="text-lead font-bold text-text">
            Text the KEPHIS scratch code to <span className="font-data text-live">1393</span>
          </p>
          <p className="text-ui text-text-muted">Built on every SMS path: SEED or MBEGU gets the three steps. Seedlings without a sticker go to the field officer.</p>
        </div>
      </div>
    </div>
  );
}

/** Part 1 arrives fourth, in the farmer's order: the seed check, with the real app recording beside it. */
export function Seed() {
  return (
    <AbsoluteFill className="bg-night">
      <PartHeading part={1} title="Buy and audit planting material" />
      <StateMachine />
      <Phone src="rec/seed.mp4" height={900} startFrom={4} playbackRate={2.6} className="left-[1390px] top-[70px]" />
    </AbsoluteFill>
  );
}
