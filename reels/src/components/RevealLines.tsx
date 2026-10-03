import { useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";

type RevealLinesProps = {
  lines: readonly string[];
  at: number;
  exitAt?: number;
  stagger?: number;
  className?: string;
};

function lineOffset(frame: number, at: number, exitAt: number | undefined) {
  const entered = progress(frame, at, 18, settle);
  const left = exitAt === undefined ? 0 : progress(frame, exitAt, 10, leave);
  return (1 - entered) * 110 - left * 110;
}

/** Each line rises into view from behind its own mask, a few frames after the one above it. */
export function RevealLines({ lines, at, exitAt, stagger = 4, className }: RevealLinesProps) {
  const frame = useCurrentFrame();
  return (
    <span className={`block ${className ?? ""}`}>
      {lines.map((line, index) => (
        <span key={line} className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
          <span className="block" style={{ translate: `0 ${lineOffset(frame, at + index * stagger, exitAt === undefined ? undefined : exitAt + index * 2)}%` }}>
            {line}
          </span>
        </span>
      ))}
    </span>
  );
}
