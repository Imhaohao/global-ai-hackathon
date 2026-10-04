import { ChatText } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { glide, progress } from "../lib/ease";

type EnvelopeProps = { from: { x: number; y: number }; to: { x: number; y: number }; at: number; duration?: number; arc?: number };

/** A text message in flight: an SMS glyph riding an arc with a short rust-light trail. */
export function Envelope({ from, to, at, duration = 24, arc = -160 }: EnvelopeProps) {
  const frame = useCurrentFrame();
  const t = progress(frame, at, duration, glide);
  if (t <= 0 || t >= 1) return null;
  const point = (s: number) => ({ x: from.x + (to.x - from.x) * s, y: from.y + (to.y - from.y) * s + arc * Math.sin(Math.PI * s) });
  const head = point(t);
  return (
    <>
      {[0.06, 0.12, 0.18].map((lag, index) => {
        const tail = point(Math.max(0, t - lag));
        return <span key={lag} className="absolute rounded-full bg-rust-glow" style={{ left: tail.x, top: tail.y, width: 14 - index * 4, height: 14 - index * 4, translate: "-50% -50%", opacity: 0.6 - index * 0.18, boxShadow: "0 0 18px var(--brand-rust)" }} />;
      })}
      <div className="absolute flex size-[84px] items-center justify-center rounded-full bg-live text-night" style={{ left: head.x, top: head.y, translate: "-50% -50%", boxShadow: "0 0 40px var(--color-live)" }}>
        <ChatText size={48} weight="fill" />
      </div>
    </>
  );
}
