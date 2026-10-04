import { useCurrentFrame } from "remotion";
import { random } from "remotion";
import { progress, settle } from "../lib/ease";
import { Spore } from "./Spore";

const NAME = "Leaf Doctor";

/**
 * The Leaf Doctor wordmark. Letters fly in from scattered positions and lock together; the rust spore lands as the
 * dot that completes it.
 */
export function Wordmark({ at, size = 220, tone = "night", showSpore = true }: { at: number; size?: number; tone?: "night" | "paper"; showSpore?: boolean }) {
  const frame = useCurrentFrame();
  const ink = tone === "night" ? "text-on-night" : "text-ink";
  return (
    <div className="flex items-center" style={{ gap: size * 0.12 }}>
      <div className={`display-poster flex ${ink}`} style={{ fontSize: size, lineHeight: 1 }}>
        {NAME.split("").map((letter, index) => {
          const land = progress(frame, at + index * 1.4, 16, settle);
          const dx = (random(`x${index}`) - 0.5) * size * 3 * (1 - land);
          const dy = (random(`y${index}`) - 0.5) * size * 1.6 * (1 - land);
          return (
            <span key={index} style={{ display: "inline-block", whiteSpace: "pre", opacity: land, translate: `${dx}px ${dy}px`, filter: `blur(${(1 - land) * 10}px)` }}>
              {letter}
            </span>
          );
        })}
      </div>
      {showSpore && (
        <div style={{ opacity: progress(frame, at + 18, 10), scale: 0.3 + 0.7 * progress(frame, at + 18, 14, settle) }}>
          <Spore size={size * 0.16} />
        </div>
      )}
    </div>
  );
}
