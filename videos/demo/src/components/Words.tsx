import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

type WordsProps = { text: string; at: number; className?: string; stagger?: number };

/** A kinetic phrase: each word rises and sharpens into place a beat after the one before. */
export function Words({ text, at, className = "", stagger = 3 }: WordsProps) {
  const frame = useCurrentFrame();
  return (
    <div className={className}>
      {text.split(" ").map((word, index) => {
        const shown = progress(frame, at + index * stagger, 12);
        return (
          <span key={index} style={{ display: "inline-block", marginRight: "0.24em", opacity: shown, translate: `0 ${(1 - shown) * 0.35}em`, filter: `blur(${(1 - shown) * 8}px)` }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}
