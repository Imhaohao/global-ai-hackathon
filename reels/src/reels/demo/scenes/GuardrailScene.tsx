import { Lock, LockOpen, ProhibitInset } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { Punch } from "../../../components/Punch";
import { RevealLines } from "../../../components/RevealLines";
import { Slab } from "../../../components/Slab";
import { Paper } from "../../../components/Surface";
import { leave, progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";
import { wordAt } from "../timeline";

const lockAt = wordAt("guardrail", "sentences");
const rejectAt = wordAt("guardrail", "team");

function ApprovedStrip({ text, index }: { text: string; index: number }) {
  const frame = useCurrentFrame();
  const enter = progress(frame, 6 + index * 6, 14);
  const locked = frame >= lockAt + index * 3;
  const Glyph = locked ? Lock : LockOpen;
  return (
    <Slab className="flex items-center gap-5 px-7 py-5" style={{ opacity: enter, translate: `${(1 - enter) * 120}px 0` }}>
      <Glyph size={44} weight={locked ? "fill" : "regular"} className="shrink-0 text-leaf" />
      <p className="text-lead font-bold">{text}</p>
    </Slab>
  );
}

function ModelStrip() {
  const frame = useCurrentFrame();
  const enter = progress(frame, 30, 14);
  const struck = progress(frame, rejectAt - 8, 10);
  const fall = progress(frame, rejectAt + 6, 18, leave);
  return (
    <div style={{ opacity: enter * (1 - fall), translate: `0 ${fall * 300}px`, rotate: `${fall * 8}deg` }}>
      <Slab tone="paper" className="relative flex items-center gap-5 px-7 py-5">
        <ProhibitInset size={44} weight="bold" className="shrink-0 text-unclear" />
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-label font-bold text-ink-muted">Swahili written by a model</p>
          <div className="flex gap-3" aria-hidden>
            {[220, 140, 260].map((width) => (
              <span key={width} className="h-[18px] rounded-full bg-ink-faint/50" style={{ width }} />
            ))}
          </div>
        </div>
        <span className="absolute inset-x-6 top-1/2 h-[6px] origin-left rounded-full bg-unclear" style={{ scale: `${struck} 1` }} />
      </Slab>
      <p className="mt-3 text-fineprint text-ink-muted" style={{ opacity: struck }}>
        We do not use model-written Swahili, because it failed our test on both model sizes.
      </p>
    </div>
  );
}

export function GuardrailScene() {
  return (
    <Punch flash={0.4}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[200px] flex flex-col gap-7">
          <RevealLines lines={["Swahili replies"]} at={2} className="display-headline text-headline text-ink" />
          {productCopy.approvedSwahiliSamples.map((text, index) => (
            <ApprovedStrip key={text} text={text} index={index} />
          ))}
          <ModelStrip />
        </div>
      </Paper>
    </Punch>
  );
}
