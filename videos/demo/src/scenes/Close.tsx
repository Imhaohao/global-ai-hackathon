import { Leaf } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FarmerGrid } from "../shared/FarmerGrid";
import { Wordmark } from "../components/Wordmark";
import { glide, leave, progress, settle } from "../lib/ease";
import { SCENES, cue, voiceEnd } from "../timeline";

const START = SCENES.close.from;
const RELEAF_AT = cue("close", "re-leaf");
const LIGHT_AT = cue("close", "reach");
export const FOLD_AT = voiceEnd("close") + 4;
export const NAME_AT = FOLD_AT + 34;
const GRID_SIZE = 760;

/** The specialist, relieved: a leaf lands on the field officer's photo as the voice says "re-leaf". */
function Specialist() {
  const frame = useCurrentFrame();
  const shown = progress(frame, START, 14, settle) * (1 - progress(frame, LIGHT_AT, 12, leave));
  const leaf = progress(frame, RELEAF_AT, 14, settle);
  return (
    <div className="absolute" style={{ left: 260, top: 200, width: 500, height: 680, opacity: shown, rotate: "-2deg" }}>
      <div className="absolute inset-0 overflow-hidden rounded-[32px]" style={{ boxShadow: "0 60px 120px rgba(0,0,0,0.6), 0 0 0 10px #f2f0ea" }}>
        <Img src={staticFile("images/field-officer.jpg")} className="size-full object-cover" style={{ objectPosition: "50% 10%" }} />
      </div>
      <div className="absolute -right-[50px] -top-[50px] flex size-[150px] items-center justify-center rounded-full" style={{ background: "#1f5135", opacity: leaf, scale: 0.3 + 0.7 * leaf, rotate: `${(1 - leaf) * -60}deg`, boxShadow: "0 0 50px rgba(127,211,155,0.7)" }}>
        <Leaf size={90} weight="fill" color="#7fd39b" />
      </div>
    </div>
  );
}

/** Everyone reached: an SMS wave lights all 100 farmers, then the grid folds into the Leaf Doctor mark and the name lands. */
export function Close() {
  const frame = useCurrentFrame();
  if (frame < START) return null;
  const enter = progress(frame, START, 12, settle);
  const centre = progress(frame, LIGHT_AT - 4, 22, glide);
  const slide = progress(frame, NAME_AT - 22, 22, glide);
  const gridX = 380 * (1 - centre) - 420 * slide;
  return (
    <AbsoluteFill className="bg-night" style={{ opacity: enter }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(31,81,53,0.4) 0%, rgba(13,15,11,0) 60%)" }} />
      <Specialist />
      <AbsoluteFill className="items-center justify-center">
        <div style={{ translate: `${gridX}px 0`, scale: (0.8 + 0.2 * centre) * (1 - 0.25 * slide), opacity: 0.45 + 0.55 * centre }}>
          <FarmerGrid stage="closing" lightAt={LIGHT_AT} closeAt={FOLD_AT} size={GRID_SIZE} swapFrames={40} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill className="items-center justify-center">
        <div style={{ translate: "260px 0" }}>
          <Wordmark at={NAME_AT} size={200} showSpore={false} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
