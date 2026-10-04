import { ChatText, GlobeSimpleX, Leaf } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { leave, progress, settle } from "../lib/ease";
import { cue } from "../timeline";
import { ROUTE } from "./framing";

/** Ends of the route in frame pixels: Noor's phone screen on the left, the cooperative's hub phone on the right. */
const FROM = { x: 400, y: 330 };
const TO = { x: 1480, y: 420 };
const LIFT = 260;
const OUT = { from: ROUTE.from + 20, to: cue("tiny", "texts") };
const BACK = { from: cue("tiny", "answered"), to: cue("tiny", "phone") + 10 };

function pointOnArc(share: number) {
  const control = { x: (FROM.x + TO.x) / 2, y: Math.min(FROM.y, TO.y) - LIFT };
  const inverse = 1 - share;
  return {
    x: inverse * inverse * FROM.x + 2 * inverse * share * control.x + share * share * TO.x,
    y: inverse * inverse * FROM.y + 2 * inverse * share * control.y + share * share * TO.y,
  };
}

function Packet({ share, shown, label }: { share: number; shown: number; label: string }) {
  const point = pointOnArc(share);
  return (
    <div className="absolute flex items-center gap-3 rounded-full bg-paper-raised px-6 py-3 text-ink" data-box="packet" style={{ left: point.x - 100, top: point.y - 40, opacity: shown, boxShadow: "0 0 40px rgba(127,211,155,0.6)" }}>
      <ChatText size={44} weight="fill" color="#1f5135" />
      <span className="display-headline figures whitespace-nowrap" style={{ fontSize: 46, lineHeight: 1 }}>
        {label}
      </span>
    </div>
  );
}

/** The cooperative's hub phone: an Android handset that receives SMS on its own SIM and answers on the device. */
function HubPhone({ offline }: { offline: number }) {
  const frame = useCurrentFrame();
  const listening = 0.6 + 0.4 * Math.sin(frame / 6);
  return (
    <div className="absolute" style={{ left: TO.x - 40, top: TO.y - 120, width: 300, height: 600, borderRadius: 54, background: "linear-gradient(160deg, #3b3a35, #151513)", padding: 14, boxShadow: "0 50px 90px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.12)" }}>
      <div className="flex size-full flex-col items-center justify-center gap-8 rounded-[42px]" style={{ background: "radial-gradient(circle at 50% 40%, #1f5135, #0d1a12 70%)" }}>
        <Leaf size={120} weight="fill" color="#7fd39b" />
        <div className="size-[26px] rounded-full" style={{ background: "#7fd39b", opacity: listening, boxShadow: "0 0 24px #7fd39b" }} />
      </div>
      <div className="absolute -top-[110px] left-1/2 -translate-x-1/2" style={{ opacity: offline, scale: 0.6 + 0.4 * offline }}>
        <GlobeSimpleX size={96} weight="bold" color="#f0641e" />
      </div>
    </div>
  );
}

/** How a reply travels: Noor's text goes to the hub phone's SIM, and the answer comes back as plain 160-character texts. */
export function SmsRoute() {
  const frame = useCurrentFrame();
  if (frame < ROUTE.from || frame > ROUTE.until + 10) return null;
  const shown = progress(frame, ROUTE.from + 8, 12, settle) * (1 - progress(frame, ROUTE.until - 6, 10, leave));
  const out = progress(frame, OUT.from, OUT.to - OUT.from);
  const back = progress(frame, BACK.from, BACK.to - BACK.from);
  const offline = progress(frame, cue("tiny", "offline"), 10, settle);
  return (
    <div className="absolute inset-0" style={{ opacity: shown }}>
      <svg className="absolute inset-0" width="1920" height="1080" aria-hidden>
        <path d={`M ${FROM.x} ${FROM.y} Q ${(FROM.x + TO.x) / 2} ${Math.min(FROM.y, TO.y) - LIFT} ${TO.x} ${TO.y}`} stroke="#7fd39b" strokeWidth="5" strokeDasharray="4 18" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
      <HubPhone offline={offline} />
      <Packet share={out} shown={out > 0 && out < 1 ? 1 : 0} label="160" />
      {[0, 1, 2].map((segment) => {
        const share = Math.min(Math.max(back * 1.25 - segment * 0.12, 0), 1);
        return <Packet key={segment} share={1 - share} shown={share > 0 && share < 1 ? 1 : 0} label="160" />;
      })}
    </div>
  );
}
