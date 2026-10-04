import type { CSSProperties } from "react";
import { OffthreadVideo, staticFile } from "remotion";

type PhoneProps = { src: string; height: number; startFrom?: number; playbackRate?: number; className?: string; videoStyle?: CSSProperties };

const ASPECT = 600 / 1304;
const BEZEL = 12;
const SCREEN_RADIUS = 46;

/** An iPhone-proportioned frame around a real screen recording. Outer radius = screen radius + bezel. */
export function Phone({ src, height, startFrom = 0, playbackRate = 1, className, videoStyle }: PhoneProps) {
  const screenHeight = height - BEZEL * 2;
  const screenWidth = screenHeight * ASPECT;
  return (
    <div
      className={`absolute ${className ?? ""}`}
      style={{
        width: screenWidth + BEZEL * 2,
        height,
        padding: BEZEL,
        borderRadius: SCREEN_RADIUS + BEZEL,
        background: "linear-gradient(145deg, #2b2e2a, #101210 60%)",
        boxShadow: "0 0 0 1.5px rgb(255 255 255 / 0.12), 0 40px 90px rgb(0 0 0 / 0.6), 0 0 120px color-mix(in srgb, var(--brand-rust) 10%, transparent)",
      }}
    >
      <div className="relative size-full overflow-hidden bg-black" style={{ borderRadius: SCREEN_RADIUS }}>
        <OffthreadVideo src={staticFile(src)} muted startFrom={Math.round(startFrom * 30)} playbackRate={playbackRate} className="absolute inset-0 size-full object-cover" style={videoStyle} />
      </div>
    </div>
  );
}

export const phoneWidth = (height: number) => (height - BEZEL * 2) * ASPECT + BEZEL * 2;
