import { useCurrentFrame } from "remotion";
import { progress, snap } from "../lib/ease";

type StatProps = {
  /** The figure as displayed when the count lands, for example "38%". Digits count up from zero. */
  value: string;
  label: string;
  source: string;
  at: number;
  countFrames?: number;
  size?: "poster" | "headline";
};

function countedValue(value: string, amount: number) {
  return value.replace(/\d+/, (digits) => String(Math.round(Number(digits) * amount)));
}

/** A sourced figure that ticks up as it lands, with its meaning in one line and its source under it. */
export function Stat({ value, label, source, at, countFrames = 22, size = "poster" }: StatProps) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 10);
  const count = progress(frame, at, countFrames, snap);
  const figureClass = size === "poster" ? "text-poster" : "text-headline";
  return (
    <div style={{ opacity: shown, translate: `0 ${(1 - shown) * 30}px` }}>
      <div className={`display-poster figures ${figureClass} text-on-night`}>{countedValue(value, count)}</div>
      <div className="mt-5 max-w-[22ch] text-lead text-on-night">{label}</div>
      <div className="mt-4 text-fine text-on-night-muted">{source}</div>
    </div>
  );
}
