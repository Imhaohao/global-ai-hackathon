import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Wordmark } from "../components/Wordmark";
import { progress } from "../lib/ease";

export const END_WORDMARK_AT = 4;

/** The wordmark slam and the one sentence a viewer should leave with. */
export function EndCard() {
  const frame = useCurrentFrame();
  const line = progress(frame, END_WORDMARK_AT + 26, 14);
  return (
    <AbsoluteFill className="items-center justify-center bg-night">
      <Img src={staticFile("images/backdrop-highlands.jpg")} className="absolute inset-0 size-full object-cover" style={{ opacity: 0.18, filter: "blur(6px) saturate(0.6)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(13,15,11,0.2) 0%, rgba(13,15,11,0.92) 75%)" }} />
      <div className="relative flex flex-col items-center gap-12">
        <Wordmark at={END_WORDMARK_AT} size={230} />
        <div className="max-w-[30ch] text-center text-lead text-on-night" style={{ opacity: line, translate: `0 ${(1 - line) * 20}px` }}>
          Coffee leaf checks that work offline, with answers by SMS on any phone.
        </div>
      </div>
    </AbsoluteFill>
  );
}
