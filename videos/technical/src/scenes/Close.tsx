import { ChatText, Leaf } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FarmerGrid } from "../components/FarmerGrid";
import { glide, leave, progress, snap } from "../lib/ease";
import { seededRandom } from "../lib/seeded";
import { wordAt } from "../lib/timeline";
import { GRID_COLOURS } from "./gridColours";

const CENTRE = { x: 960, y: 520 };

/** The officer under a pile of case texts; on "re-leaf" each text turns into a leaf and drifts off her. */
function Relief({ exitAt }: { exitAt: number }) {
  const frame = useCurrentFrame();
  const random = seededRandom(14);
  const releaf = wordAt("close", "re-leaf");
  const exit = progress(frame, exitAt, 12, leave);
  return (
    <AbsoluteFill style={{ opacity: progress(frame, 0, 10) * (1 - exit) }}>
      <div className="absolute size-[320px] overflow-hidden rounded-full" style={{ left: CENTRE.x - 160, top: CENTRE.y - 160, boxShadow: "0 0 0 4px var(--color-live), 0 0 90px color-mix(in srgb, var(--color-live) 30%, transparent)" }}>
        <Img src={staticFile("media/officer-portrait.jpg")} className="size-full object-cover" />
      </div>
      {Array.from({ length: 22 }, (_, index) => {
        const angle = random() * Math.PI * 2;
        const radius = 200 + random() * 140;
        const pile = progress(frame, 2 + index * 1.2, 10, snap);
        const lift = progress(frame, releaf + random() * 20, 30, glide);
        const x = CENTRE.x + Math.cos(angle) * radius * (0.6 + 0.4 * pile) + lift * (random() - 0.3) * 500;
        const y = CENTRE.y + Math.sin(angle) * radius * 0.8 - lift * (300 + random() * 300);
        const Glyph = lift > 0.15 ? Leaf : ChatText;
        return <Glyph key={index} size={58} weight="fill" className="absolute" style={{ left: x, top: y, translate: "-50% -50%", color: lift > 0.15 ? "var(--color-live)" : "var(--brand-rust-glow)", opacity: pile * (1 - lift * 0.9), rotate: `${lift * 120}deg` }} />;
      })}
    </AbsoluteFill>
  );
}

/** Solution: specialists relieved, then the same 100 farmers each reached by a text, folding into the mark. */
export function Close() {
  const frame = useCurrentFrame();
  const reachAt = wordAt("close", "reach") - 4;
  const closeAt = wordAt("close", "need") - 8;
  const name = progress(frame, closeAt + 30, 10, snap);
  const slide = progress(frame, closeAt + 18, 24, glide);
  return (
    <AbsoluteFill className="bg-night">
      <Relief exitAt={reachAt - 8} />
      {frame >= reachAt - 8 && (
        <div className="absolute top-[150px]" style={{ left: 570 - slide * 430, opacity: progress(frame, reachAt - 8, 8) }}>
          <FarmerGrid stage="closing" lightAt={reachAt + 2} closeAt={closeAt} size={780} swapFrames={34} colours={GRID_COLOURS} />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: "radial-gradient(50% 45% at 50% 50%, color-mix(in srgb, var(--brand-rust) 14%, transparent), transparent 70%)", opacity: slide }} />
      <p className="absolute left-[880px] top-[430px] whitespace-nowrap display-poster text-wordmark text-text" style={{ opacity: name, scale: String(1.25 - 0.25 * name), filter: `blur(${(1 - name) * 12}px)` }}>
        Leaf Doctor
      </p>
    </AbsoluteFill>
  );
}
