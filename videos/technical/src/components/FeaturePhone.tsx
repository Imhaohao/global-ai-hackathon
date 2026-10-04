import { useCurrentFrame } from "remotion";

type FeaturePhoneProps = { text: string; typeAt: number; charsPerFrame?: number; x: number; y: number };

/** A basic phone drawn flat: an LCD that types the farmer's text key by key, above a keypad. */
export function FeaturePhone({ text, typeAt, charsPerFrame = 1.3, x, y }: FeaturePhoneProps) {
  const frame = useCurrentFrame();
  const typed = text.slice(0, Math.max(0, Math.floor((frame - typeAt) * charsPerFrame)));
  const caret = Math.floor(frame / 8) % 2 === 0;
  return (
    <div className="absolute w-[270px] rounded-[44px] bg-handset p-5 pb-8" style={{ left: x, top: y, boxShadow: "0 30px 70px rgb(0 0 0 / 0.55), inset 0 1px 0 rgb(255 255 255 / 0.08)" }}>
      <div className="h-[230px] rounded-[24px] bg-lcd p-4">
        <p className="font-data text-lcd text-lcd-ink">
          {typed}
          <span style={{ opacity: caret ? 1 : 0 }}>▌</span>
        </p>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((key) => (
          <div key={key} className="flex h-[40px] items-center justify-center rounded-full bg-handset-key text-ui font-bold text-text-muted">
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}
