import { Leaf } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { progress, snap } from "../lib/ease";
import { Spore } from "./Spore";

type WordmarkProps = { at: number; size?: number };

/** The leaf mark and name slamming in: big and blurred to sharp, with the rust spore lit on the leaf tip. */
export function Wordmark({ at, size = 1 }: WordmarkProps) {
  const frame = useCurrentFrame();
  const slam = progress(frame, at, 9, snap);
  const glow = progress(frame, at + 6, 18);
  return (
    <div className="flex items-center gap-8" style={{ scale: String(size * (1.35 - 0.35 * slam)), opacity: slam, filter: `blur(${(1 - slam) * 14}px)` }}>
      <div className="relative" style={{ width: 170, height: 170 }}>
        <Leaf size={170} weight="fill" className="text-live" />
        <Spore x={124} y={44} size={44 * glow} opacity={glow} />
      </div>
      <span className="display-poster text-poster text-text">Leaf Doctor</span>
    </div>
  );
}
