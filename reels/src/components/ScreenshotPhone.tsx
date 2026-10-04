import { Img, staticFile } from "remotion";
import { Handset } from "./Handset";

const SCREENSHOT_ASPECT = 3120 / 1440;
const BEZEL = 14;

export type ScreenRegion = { top: number; height: number };

type ScreenshotPhoneProps = {
  src: string;
  width: number;
  /** A band of the screenshot, as shares of its height, to light up with a rust ring. */
  highlight?: ScreenRegion;
  highlightOn?: number;
};

/** A real app screenshot from docs/screens, shown inside the handset at its own proportions. */
export function ScreenshotPhone({ src, width, highlight, highlightOn = 0 }: ScreenshotPhoneProps) {
  const screenWidth = width - BEZEL * 2;
  const screenHeight = screenWidth * SCREENSHOT_ASPECT;
  return (
    <Handset width={width} height={screenHeight + BEZEL * 2}>
      <Img src={staticFile(src)} className="absolute inset-0 size-full object-cover" />
      {highlight && highlightOn > 0 && (
        <div
          className="absolute inset-x-2 rounded-md"
          style={{
            top: highlight.top * screenHeight,
            height: highlight.height * screenHeight,
            boxShadow: `0 0 0 ${4 * highlightOn}px color-mix(in srgb, var(--brand-rust) ${80 * highlightOn}%, transparent), 0 0 ${36 * highlightOn}px ${6 * highlightOn}px color-mix(in srgb, var(--brand-rust-glow) ${45 * highlightOn}%, transparent)`,
          }}
        />
      )}
    </Handset>
  );
}
