import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FarmerGrid } from "../components/FarmerGrid";
import { glide, progress, snap } from "../lib/ease";
import { wordAt } from "../lib/timeline";
import { GRID_COLOURS } from "./gridColours";

/** Solution: the same 100 farmers, every one reached by a text, folding back together into the Leaf Doctor mark. */
export function Close() {
  const frame = useCurrentFrame();
  const closeAt = wordAt("close", "Leaf") - 26;
  const name = progress(frame, wordAt("close", "Leaf") + 4, 10, snap);
  const slide = progress(frame, closeAt + 20, 26, glide);
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute inset-0" style={{ background: "radial-gradient(50% 45% at 50% 50%, color-mix(in srgb, var(--brand-rust) 14%, transparent), transparent 70%)", opacity: slide }} />
      <div className="absolute top-[150px]" style={{ left: 580 - slide * 440 }}>
        <FarmerGrid stage="closing" lightAt={2} closeAt={closeAt} size={780} swapFrames={34} colours={GRID_COLOURS} />
      </div>
      <p className="absolute left-[880px] top-[440px] whitespace-nowrap display-poster text-wordmark text-text" style={{ opacity: name, scale: String(1.25 - 0.25 * name), filter: `blur(${(1 - name) * 12}px)` }}>
        Leaf Doctor
      </p>
    </AbsoluteFill>
  );
}
