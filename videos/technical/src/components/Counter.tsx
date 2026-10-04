import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

type CounterProps = { to: number; at: number; duration?: number; decimals?: number; suffix?: string; className?: string };

/** A figure that counts up from zero; tabular digits keep its width steady while it ticks. */
export function Counter({ to, at, duration = 24, decimals = 0, suffix = "", className }: CounterProps) {
  const frame = useCurrentFrame();
  const value = to * progress(frame, at, duration);
  const text = value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span className={`figures ${className ?? ""}`}>{`${text}${suffix}`}</span>;
}
