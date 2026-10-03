import { useCurrentFrame } from "remotion";
import { progress, settle } from "../lib/ease";

type CountUpProps = { value: number; decimals?: number; at: number; duration?: number; suffix?: string; className?: string };

/** A figure that counts up to its value, with fixed-width digits so the number does not jitter. */
export function CountUp({ value, decimals = 1, at, duration = 30, suffix = "", className }: CountUpProps) {
  const frame = useCurrentFrame();
  const shown = value * progress(frame, at, duration, settle);
  return (
    <span className={`figures ${className ?? ""}`}>
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
