import { Img, staticFile, useCurrentFrame } from "remotion";
import { progress, settle } from "../lib/ease";

export type Bubble = { from: "farmer" | "bot"; text: string; at: number };

const HEADER_HEIGHT = 162;
const COMPOSER_HEIGHT = 377;

/**
 * The same iMessage thread as the real recording, continued: the header and keyboard are cropped from a frame of
 * ScreenRecording 22-52-31, and new bubbles carry the bot's real replies, sliding the thread up as they arrive.
 */
export function Thread({ bubbles }: { bubbles: Bubble[] }) {
  const frame = useCurrentFrame();
  const visible = bubbles.filter((bubble) => frame >= bubble.at - 2);
  return (
    <div className="ios-text absolute inset-0 bg-black">
      <div className="absolute inset-x-0 flex flex-col justify-end gap-2 overflow-hidden px-[14px] pb-3" style={{ top: HEADER_HEIGHT, bottom: COMPOSER_HEIGHT }}>
        {visible.map((bubble) => (
          <Message key={bubble.at} bubble={bubble} />
        ))}
      </div>
      <Img src={staticFile("images/sms-header.png")} className="absolute inset-x-0 top-0 w-full" />
      <Img src={staticFile("images/sms-composer.png")} className="absolute inset-x-0 bottom-0 w-full" />
    </div>
  );
}

function Message({ bubble }: { bubble: Bubble }) {
  const frame = useCurrentFrame();
  const land = progress(frame, bubble.at, 10, settle);
  const isFarmer = bubble.from === "farmer";
  const colour = isFarmer ? "bg-imessage-blue self-end" : "bg-imessage-grey self-start";
  return (
    <div
      className={`max-w-[272px] rounded-[18px] px-3 py-2 text-[13.5px] leading-[17.5px] text-white ${colour}`}
      style={{ opacity: land, scale: 0.85 + land * 0.15, transformOrigin: isFarmer ? "100% 100%" : "0% 100%", marginTop: (1 - land) * -40 }}
    >
      {bubble.text}
    </div>
  );
}
