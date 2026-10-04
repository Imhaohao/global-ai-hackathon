import { CheckCircle, GlobeSimpleX, PhoneOutgoing, User } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { progress } from "../lib/ease";

const INK = "var(--brand-lcd-ink)";

/** What the basic phone's screen shows at a moment. Text is always the real SMS text, a page at a time. */
export type LcdView =
  | { kind: "compose"; to: string; body: string; sentAt?: number }
  | { kind: "message"; from: "in" | "out"; text: string; at: number }
  | { kind: "calling"; who: string; at: number }
  | { kind: "idle" };

/** Signal bars and no-data mark: SMS gets through on two bars with no mobile internet at all. */
function StatusRow() {
  return (
    <div className="flex items-center justify-between px-6 pt-4" style={{ color: INK, height: 76 }}>
      <div className="flex items-end gap-[6px]">
        {[16, 26, 36, 46].map((height, bar) => (
          <div key={height} style={{ width: 13, height, background: INK, opacity: bar < 2 ? 1 : 0.18 }} />
        ))}
        <GlobeSimpleX size={44} weight="bold" style={{ marginLeft: 14 }} />
      </div>
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return (
    <div className="font-data px-7" style={{ color: INK, fontSize: 52, lineHeight: 1.18, fontWeight: 600, overflowWrap: "break-word" }}>
      {children}
    </div>
  );
}

function Compose({ view }: { view: Extract<LcdView, { kind: "compose" }> }) {
  const frame = useCurrentFrame();
  const sent = view.sentAt !== undefined && frame >= view.sentAt;
  return (
    <>
      <div className="font-data mx-5 mt-2 flex items-center gap-3 rounded-md px-3 py-1" style={{ background: INK, color: "var(--brand-lcd)", fontSize: 44, fontWeight: 700 }}>
        <span>To:</span>
        <span>{view.to}</span>
      </div>
      <div className="mt-3" style={{ opacity: sent ? 1 - progress(frame, view.sentAt ?? 0, 6) : 1 }}>
        <Body>
          {lastLines(view.body)}
          <span style={{ opacity: Math.floor(frame / 8) % 2 ? 1 : 0 }}>|</span>
        </Body>
      </div>
      {sent && (
        <div className="absolute inset-x-0 top-[200px] flex justify-center" style={{ color: INK, scale: 0.6 + 0.4 * progress(frame, view.sentAt ?? 0, 8) }}>
          <CheckCircle size={170} weight="fill" />
        </div>
      )}
    </>
  );
}

/** While typing, the screen keeps only the end of the text in view, like a real basic phone. */
function lastLines(text: string) {
  const maxChars = 24;
  if (text.length <= maxChars) return text;
  const cut = text.slice(-maxChars);
  return cut.slice(cut.indexOf(" ") + 1);
}

function Message({ view }: { view: Extract<LcdView, { kind: "message" }> }) {
  const frame = useCurrentFrame();
  const arrive = progress(frame, view.at, 9);
  return (
    <div style={{ translate: `0 ${(1 - arrive) * 60}px`, opacity: arrive }}>
      <div className="mx-6 mt-1 flex items-center" style={{ color: INK, gap: 10 }}>
        {view.from === "in" ? <User size={46} weight="fill" /> : <CheckCircle size={46} weight="fill" />}
        <div style={{ flex: 1, height: 4, background: INK, opacity: 0.4 }} />
      </div>
      <div className="mt-3">
        <Body>{view.text}</Body>
      </div>
    </div>
  );
}

function Calling({ view }: { view: Extract<LcdView, { kind: "calling" }> }) {
  const frame = useCurrentFrame();
  const pulse = (frame - view.at) % 24;
  return (
    <div className="flex flex-col items-center pt-6" style={{ color: INK }}>
      <div style={{ scale: 1 + (pulse < 12 ? pulse / 60 : (24 - pulse) / 60) }}>
        <PhoneOutgoing size={170} weight="fill" />
      </div>
      <div className="font-data mt-6 text-center" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>
        {view.who}
      </div>
    </div>
  );
}

/** The resting screen: the clock and nothing else. */
function Idle() {
  return (
    <div className="font-data flex justify-center pt-16" style={{ color: INK, fontSize: 150, fontWeight: 700 }}>
      07:12
    </div>
  );
}

const VIEWS = { compose: Compose, message: Message, calling: Calling, idle: Idle } as const;

/** The phone's LCD for one view, with its status row. */
export function LcdScreen({ view }: { view: LcdView }) {
  const View = VIEWS[view.kind] as (props: { view: LcdView }) => ReactNode;
  return (
    <div className="relative size-full overflow-hidden" data-box="lcd">
      <StatusRow />
      <View view={view} />
    </div>
  );
}
