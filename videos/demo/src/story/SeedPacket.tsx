import { Coin } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";

/**
 * A certified seed packet with its scratch sticker. The silver layer wipes away under a coin to show the code, which
 * stays out of focus: the video never shows or implies a real code or its length.
 */
export function SeedPacket({ from, scratchAt, until }: { from: number; scratchAt: number; until: number }) {
  const frame = useCurrentFrame();
  const shown = progress(frame, from, 16, settle) * (1 - progress(frame, until - 10, 10, leave));
  const scratched = progress(frame, scratchAt, 26);
  return (
    <div className="absolute" style={{ left: 300, top: 220, width: 520, height: 680, opacity: shown, translate: `${(1 - shown) * -60}px 0`, rotate: "-4deg" }}>
      <div className="absolute inset-0 rounded-[18px]" style={{ background: "linear-gradient(160deg, #c9a97a, #a8865a 60%, #8f704a)", boxShadow: "0 50px 90px rgba(0,0,0,0.55), inset 0 0 40px rgba(60,40,20,0.35)" }} />
      <div className="absolute inset-x-0 top-0 h-[60px] rounded-t-[18px]" style={{ background: "repeating-linear-gradient(90deg, #b8976a 0 10px, #a8865a 10px 20px)" }} />
      <svg className="absolute" style={{ left: 150, top: 120 }} width="220" height="220" viewBox="0 0 100 100" aria-hidden>
        <ellipse cx="38" cy="50" rx="20" ry="28" fill="#5b2f1d" />
        <path d="M38 24 Q30 50 38 76" stroke="#3a1c10" strokeWidth="3" fill="none" />
        <ellipse cx="66" cy="54" rx="18" ry="25" fill="#6e3a24" />
        <path d="M66 31 Q59 54 66 78" stroke="#3a1c10" strokeWidth="3" fill="none" />
      </svg>
      <div className="absolute overflow-hidden rounded-[12px]" style={{ left: 70, top: 420, width: 380, height: 150, background: "#f3efe4", boxShadow: "inset 0 0 0 4px #d8d2c2" }}>
        <div className="absolute inset-x-[34px] inset-y-[44px] rounded-md" style={{ filter: "blur(10px)", background: "repeating-linear-gradient(90deg, #2a2a26 0 26px, #6c6a62 26px 34px, #2a2a26 34px 47px, #8f8c82 47px 52px)" }} />
        <div className="absolute inset-y-0 right-0" style={{ left: `${scratched * 100}%`, background: "linear-gradient(135deg, #d9d9d6, #9c9c98 50%, #e4e4e0)" }} />
      </div>
      <div className="absolute" style={{ left: 70 + scratched * 330, top: 450, opacity: scratched > 0 && scratched < 1 ? 1 : 0, rotate: `${scratched * 40}deg` }}>
        <Coin size={110} weight="fill" color="#d6b25e" />
      </div>
    </div>
  );
}
