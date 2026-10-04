import { Leaf, Question, User } from "@phosphor-icons/react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Counter } from "../components/Counter";
import { Phone } from "../components/Phone";
import { ACCURACY, BENCH_ROWS, EXTERNAL_RUST, MODEL, SPLIT, VOTE } from "../data/facts";
import { glide, leave, progress } from "../lib/ease";
import { wordAt } from "../lib/timeline";

const AXIS = { min: 80, max: 100, width: 640 };
/** Two clean stretches of the scan recording, skipping the camera sheet's black slide between them. */
const SCAN_CHECKING = { from: 10.2, frames: 24 };
const SCAN_RESULT_FROM = 14.0;

function Window({ from, to, children }: { from: number; to: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, from, 12) - progress(frame, to, 10, leave);
  if (shown <= 0) return null;
  return <div className="absolute inset-0" style={{ opacity: shown, translate: `0 ${(1 - progress(frame, from, 12)) * 30}px` }}>{children}</div>;
}

function AccuracyBars({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <div className="absolute left-[96px] top-[150px] w-[1100px]">
      <p className="display-headline text-title text-text">
        Accuracy on <span className="figures">{SPLIT.test.toLocaleString("en-US")}</span> held-out images
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {ACCURACY.map((row, index) => {
          const lit = row.model === "B2";
          const grow = progress(frame, at + index * 4, 26, glide);
          return (
            <div key={row.model} className="flex items-center gap-5">
              <span className={`w-[70px] text-lead font-bold ${lit ? "text-live" : "text-text-muted"}`}>{row.model}</span>
              <div className="h-[44px]" style={{ width: ((row.value - AXIS.min) / (AXIS.max - AXIS.min)) * AXIS.width * grow, background: lit ? "var(--color-live)" : "var(--color-night-line)" }} />
              <Counter to={row.value} at={at + index * 4} duration={26} decimals={2} suffix="%" className={`font-data text-lead ${lit ? "text-live" : "text-text-muted"}`} />
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-fineprint text-text-faint">Bars start at 80%. B3 is above the 10 MB app limit, so it stays out of the app.</p>
      <table className="mt-8 w-[860px] text-label" style={{ opacity: progress(frame, at + 26, 12) }}>
        <thead>
          <tr className="text-ui text-text-faint">
            <th className="pb-2 text-left font-normal" />
            <th className="pb-2 text-right font-normal">B0</th>
            <th className="pb-2 text-right font-normal">B2</th>
          </tr>
        </thead>
        <tbody>
          {BENCH_ROWS.map((row) => (
            <tr key={row.label} style={{ boxShadow: "inset 0 1px 0 var(--color-night-line)" }}>
              <td className="py-2 text-text">{row.label}</td>
              <td className="py-2 text-right font-data text-text-muted figures">{row.b0}</td>
              <td className="py-2 text-right font-data font-bold text-live figures">{row.b2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Spec({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="py-4" style={{ boxShadow: "inset 0 1px 0 var(--color-night-line)" }}>
      <p className="text-ui text-text-muted">{label}</p>
      <p className="font-data text-label text-text figures">{value}</p>
      {note && <p className="text-fineprint text-text-faint">{note}</p>}
    </div>
  );
}

function Footprint({ at }: { at: number }) {
  return (
    <div className="absolute left-[96px] top-[150px] w-[1100px]">
      <div className="flex items-baseline gap-5">
        <Counter to={MODEL.sizeMb} at={at} duration={22} decimals={2} className="display-poster text-poster text-text" />
        <span className="display-headline text-headline text-text-muted">MB, offline</span>
      </div>
      <div className="mt-4 grid w-[1040px] grid-cols-2 gap-x-12">
        <Spec label="TFLite weights and compute" value="INT8 storage, float32 math" />
        <Spec label="Network calls during inference" value="0" note="Sockets blocked in the offline check" />
        <Spec label="One photo on a desktop CPU" value={`about ${MODEL.responseMs} ms`} note="Speed on a real phone is not measured yet" />
        <Spec label={`External rust scans, ${EXTERNAL_RUST.images.toLocaleString("en-US")} images, AUROC`} value={`B2 ${EXTERNAL_RUST.b2} in ${EXTERNAL_RUST.b2Time}`} note={`GPT-6 Astra ${EXTERNAL_RUST.astra} in ${EXTERNAL_RUST.astraTime}, team benchmark`} />
      </div>
    </div>
  );
}

type Slot = "rust" | "unclear" | "healthy";
const SLOTS: Slot[] = ["rust", "rust", "unclear", "rust", "healthy", "rust"];
const SLOT_COLOUR: Record<Slot, string> = { rust: "var(--color-rust-class)", unclear: "var(--color-text-faint)", healthy: "var(--color-healthy)" };

function Vote({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const verdict = progress(frame, at + 34, 12);
  const person = progress(frame, at + 48, 12);
  return (
    <div className="absolute left-[96px] top-[150px] w-[1120px]">
      <p className="display-headline text-title text-text">Six leaves vote on one plant</p>
      <div className="mt-10 flex gap-5">
        {SLOTS.map((slot, index) => {
          const shown = progress(frame, at + index * 4, 10);
          return (
            <div key={index} className="flex size-[120px] items-center justify-center rounded-md bg-night-high" style={{ opacity: shown, scale: String(0.7 + 0.3 * shown), color: SLOT_COLOUR[slot] }}>
              {slot === "unclear" ? <Question size={58} weight="bold" /> : <Leaf size={62} weight="fill" />}
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-lead text-text" style={{ opacity: verdict }}>
        <span className="font-bold" style={{ color: "var(--color-rust-class)" }}>Rust</span>, from 4 of 5 clear leaves
      </p>
      <p className="mt-2 text-label text-text-muted" style={{ opacity: verdict }}>
        A verdict needs {VOTE.agree} agreeing leaves and {VOTE.share}% of the clear ones. Unclear photos never vote.
      </p>
      <div className="mt-10 flex items-center gap-5 rounded-lg bg-night-high px-8 py-6" style={{ opacity: person, translate: `0 ${(1 - person) * 20}px` }}>
        <User size={52} weight="bold" className="text-live" />
        <p className="text-lead text-text">Too few clear leaves or a split vote: “not sure”, with a case summary for the extension officer</p>
      </div>
    </div>
  );
}

/** Part 2's results: the held-out benchmark, what fits on the phone, and the vote that routes doubt to a person. */
export function Bench() {
  const footprintAt = wordAt("bench", "offline") - 6;
  const voteAt = wordAt("bench", "Unsure") - 8;
  return (
    <AbsoluteFill className="bg-night">
      <Window from={0} to={footprintAt - 10}>
        <AccuracyBars at={4} />
      </Window>
      <Window from={footprintAt} to={voteAt - 10}>
        <Footprint at={footprintAt} />
      </Window>
      <Window from={voteAt} to={9999}>
        <Vote at={voteAt} />
      </Window>
      <Sequence durationInFrames={SCAN_CHECKING.frames} layout="none">
        <Phone src="rec/scan.mp4" height={900} startFrom={SCAN_CHECKING.from} className="left-[1390px] top-[70px]" />
      </Sequence>
      <Sequence from={SCAN_CHECKING.frames} layout="none">
        <Phone src="rec/scan.mp4" height={900} startFrom={SCAN_RESULT_FROM} className="left-[1390px] top-[70px]" />
      </Sequence>
    </AbsoluteFill>
  );
}
