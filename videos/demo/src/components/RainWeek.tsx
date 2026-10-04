import { CloudRain, Drop } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { progress, settle } from "../lib/ease";

const DAYS = 7;

/**
 * The spray rule from shared/src/actionCard.ts and wetDays.ts: rust spray advice switches on only when fresh rain data
 * shows at least 3 wet days in the last 7. Days fill in as wet at the given frames.
 */
export function RainWeek({ wetAt }: { wetAt: number[] }) {
  const frame = useCurrentFrame();
  const unlocked = progress(frame, wetAt[wetAt.length - 1] + 6, 12, settle);
  return (
    <div className="flex flex-col items-center gap-10">
      <div className="flex gap-6">
        {Array.from({ length: DAYS }, (_, day) => {
          const wetIndex = day - (DAYS - wetAt.length);
          const wet = wetIndex >= 0 ? progress(frame, wetAt[wetIndex], 10, settle) : 0;
          return (
            <div key={day} className="flex size-[150px] items-center justify-center rounded-[28px]" style={{ background: `rgba(26,29,23,${0.75 - wet * 0.2})`, boxShadow: `0 0 0 ${wet * 4}px rgba(127,192,255,0.85), 0 20px 50px rgba(0,0,0,0.4)` }}>
              <Drop size={72} weight={wet > 0.5 ? "fill" : "regular"} color={wet > 0.5 ? "#9ccfff" : "#8c877c"} style={{ scale: 0.8 + wet * 0.3 }} />
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-5 text-title display-headline text-on-night" style={{ opacity: unlocked, translate: `0 ${(1 - unlocked) * 20}px` }}>
        <CloudRain size={80} weight="bold" color="#9ccfff" />
        <span>3 wet days in 7 before spray advice</span>
      </div>
      <div className="text-label text-on-night-muted" style={{ opacity: unlocked }}>
        The rule covers rust, with rain from CHIRPS or NASA POWER under 3 days old.
      </div>
    </div>
  );
}
