import { CellSignalSlash } from "@phosphor-icons/react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { FarmerGrid } from "../components/FarmerGrid";
import { FlipPhone } from "../components/FlipPhone";
import { Stat } from "../components/Stat";
import { ACCESS } from "../data/facts";
import { glide, progress } from "../lib/ease";
import { at } from "../lib/timeline";
import { GRID_COLOURS } from "./gridColours";

const GRID = { left: 160, top: 120, size: 840 };

/** One officer on the right with a faint line to every farmer: few people, stretched across many. */
function OfficerFan({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const drawn = progress(frame, at, 30, glide);
  const officer = { x: 1560, y: 540 };
  const cell = GRID.size / 10;
  return (
    <AbsoluteFill style={{ opacity: progress(frame, at, 10) }}>
      <svg className="absolute inset-0" width={1920} height={1080}>
        {Array.from({ length: 100 }, (_, farmer) => {
          const x = GRID.left + (farmer % 10) * cell + cell / 2;
          const y = GRID.top + Math.floor(farmer / 10) * cell + cell / 2;
          return <line key={farmer} x1={officer.x} y1={officer.y} x2={officer.x + (x - officer.x) * drawn} y2={officer.y + (y - officer.y) * drawn} stroke="var(--color-live)" strokeWidth={1} opacity={0.22} />;
        })}
      </svg>
      <div className="absolute size-[220px] overflow-hidden rounded-full" style={{ left: officer.x - 110, top: officer.y - 110, boxShadow: "0 0 0 4px var(--color-live), 0 0 80px color-mix(in srgb, var(--color-live) 30%, transparent)" }}>
        <Img src={staticFile("media/officer-portrait.jpg")} className="size-full object-cover" />
      </div>
    </AbsoluteFill>
  );
}

/** Noor's own basic phone, shrunk to an icon, so the statistic and the hero object are the same thing. */
function MiniFlipPhone() {
  return (
    <div style={{ width: 66, height: 146 }}>
      <div style={{ scale: "0.183", transformOrigin: "0 0" }}>
        <FlipPhone screen={null} />
      </div>
    </div>
  );
}

/** Problem: 100 rural Kenyan adults; 38 on a basic text phone, 66 not online daily, and one officer for many. */
export function Problem() {
  const phonesAt = at("problem", "thirty-eight");
  const signalAt = at("problem", "sixty-six");
  const officerAt = at("problem", "farm") - 4;
  return (
    <AbsoluteFill className="bg-night">
      <div className="absolute" style={{ left: GRID.left, top: GRID.top }}>
        <FarmerGrid stage="opening" phonesAt={phonesAt} signalAt={signalAt} size={GRID.size} swapFrames={30} colours={GRID_COLOURS} />
      </div>
      <div className="absolute left-[1180px] top-[300px] flex flex-col gap-16">
        <Stat value={ACCESS.basicPhone} icon={<MiniFlipPhone />} at={phonesAt} exitAt={officerAt - 6} />
        <Stat value={ACCESS.notDailyOnline} icon={<CellSignalSlash size={120} weight="bold" />} at={signalAt} exitAt={officerAt - 6} tone="rust" />
      </div>
      <OfficerFan at={officerAt} />
    </AbsoluteFill>
  );
}
