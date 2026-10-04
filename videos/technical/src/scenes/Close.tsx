import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Wordmark } from "../components/Wordmark";
import { leave, progress } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const GAPS = [
  { title: "Coffee berry disease", note: "A berry disease; no labelled photos" },
  { title: "Coffee berry borer", note: "An insect in the berries" },
  { title: "Coffee wilt", note: "Whole branches wilt and die" },
  { title: "Noor’s own slope", note: "No photos from her farm or her phone yet" },
];

function Gaps({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const exit = progress(frame, exitAt, 8, leave);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <p className="absolute left-[96px] top-[150px] display-headline text-headline text-text" style={{ opacity: progress(frame, 0, 10) }}>
        Not in the training data
      </p>
      <div className="absolute left-[96px] top-[300px] grid w-[1728px] grid-cols-4 gap-8">
        {GAPS.map((gap, index) => {
          const shown = progress(frame, 4 + index * 5, 12);
          return (
            <div key={gap.title} className="relative h-[360px] overflow-hidden bg-night-raised p-8" style={{ opacity: shown, translate: `0 ${(1 - shown) * 30}px` }}>
              <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--color-night-line) 0 2px, transparent 2px 18px)" }} />
              <p className="relative display-headline text-title text-text">{gap.title}</p>
              <p className="relative mt-4 text-label text-text-muted">{gap.note}</p>
            </div>
          );
        })}
      </div>
      <p className="absolute left-[96px] top-[710px] text-lead text-text" style={{ opacity: progress(frame, 24, 12) }}>
        So every result carries a recheck date and a person to call.
      </p>
    </AbsoluteFill>
  );
}

function EndCard({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const flash = Math.min(progress(frame, at - 4, 4), 1 - progress(frame, at, 14));
  const line = progress(frame, at + 16, 14);
  if (frame < at - 4) return null;
  return (
    <AbsoluteFill>
      <AbsoluteFill className="bg-night" style={{ opacity: progress(frame, at - 4, 4) }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(55% 45% at 50% 45%, color-mix(in srgb, var(--brand-rust) 20%, transparent), transparent 70%)" }} />
        <div className="absolute inset-x-0 top-[360px] flex justify-center">
          <Wordmark at={at} />
        </div>
        <p className="absolute inset-x-0 top-[640px] text-center text-lead text-text-muted" style={{ opacity: line }}>
          Seed check, leaf model, SMS help and a hotspot map, on the phone a farmer already has
        </p>
        <p className="absolute inset-x-0 top-[720px] text-center text-ui text-text-faint" style={{ opacity: line }}>
          Research prototype for the Hack-Nation Small AI for Development challenge. Field accuracy is not measured yet.
        </p>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#fff6e6", opacity: flash }} />
    </AbsoluteFill>
  );
}

/** The honest limit in one beat, then the name. */
export function Close() {
  const brandAt = wordAt("close", "Leaf") - 2;
  return (
    <AbsoluteFill className="bg-night">
      <Gaps exitAt={brandAt - 6} />
      <EndCard at={brandAt} />
    </AbsoluteFill>
  );
}
