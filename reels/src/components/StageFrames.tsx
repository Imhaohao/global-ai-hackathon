import { Img, staticFile, useCurrentFrame } from "remotion";

/** Plays a rendered image sequence (folder/name_0001.jpg ...) one file per frame, holding the last one. */
export function StageFrames({ folder, name, count }: { folder: string; name: string; count: number }) {
  const index = Math.min(count, useCurrentFrame() + 1);
  return <Img src={staticFile(`${folder}/${name}_${String(index).padStart(4, "0")}.jpg`)} className="absolute inset-0 size-full object-cover" />;
}
