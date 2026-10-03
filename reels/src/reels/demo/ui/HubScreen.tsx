import { CheckCircle, CloudCheck, CloudSlash, WifiHigh, WifiSlash } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { progress } from "../../../lib/ease";
import productCopy from "../productCopy.json";
import { ScreenCard, Spotlight } from "./kit";

// Recreated from hub/App.tsx and hub/src/components: ListeningControl, ServerConnectionCard, ModelCard, ExchangeCard.

export type HubMoments = { exchangeAt: number; offlineAt: number; modelAt: number; replyAt: number; confirmAt: number };

function PulsingDot({ frame }: { frame: number }) {
  const pulse = (frame % 42) / 42;
  return (
    <span className="relative flex size-[30px] items-center justify-center">
      <span className="absolute size-[22px] rounded-full bg-live" style={{ opacity: 0.6 * (1 - pulse), scale: String(1 + pulse * 1.6) }} />
      <span className="size-[22px] rounded-full bg-live" />
    </span>
  );
}

function ServerCard({ offline }: { offline: boolean }) {
  const Glyph = offline ? CloudSlash : CloudCheck;
  return (
    <ScreenCard className="flex items-start gap-4">
      <Glyph size={38} weight="fill" className={offline ? "text-ink-muted" : "text-leaf"} />
      <div className="flex-1">
        <p className="text-app-heading font-bold">{offline ? "Token saved, server out of reach" : "Connected to Leaf Doctor server"}</p>
        <p className="text-app-small text-ink-muted">
          {offline
            ? "The hub keeps answering from the rules on this phone and will use the server when the signal returns."
            : "Texts are answered online first. The offline rules take over when there is no signal."}
        </p>
      </div>
    </ScreenCard>
  );
}

function ModelReadyRow() {
  return (
    <ScreenCard className="flex items-center gap-4">
      <CheckCircle size={38} weight="fill" className="text-leaf" />
      <div>
        <p className="text-app-heading font-bold">Offline language model ready</p>
        <p className="text-app-small text-ink-muted">Qwen3.5 2B (Q4_K_M), running on the processor</p>
      </div>
    </ScreenCard>
  );
}

function ExchangeCard({ frame, moments }: { frame: number; moments: HubMoments }) {
  const offline = frame >= moments.offlineAt;
  const SourceIcon = offline ? WifiSlash : WifiHigh;
  const replyShare = progress(frame, moments.replyAt, 28, (t) => t);
  const reply = productCopy.hubReply.slice(0, Math.round(replyShare * productCopy.hubReply.length));
  return (
    <ScreenCard className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-app-heading font-bold">Phone ending 0417</p>
        <span className="flex items-center gap-2 text-app-small text-ink-muted">
          9:12 <SourceIcon size={30} weight={offline ? "regular" : "bold"} />
        </span>
      </div>
      <p className="text-app-body">{productCopy.noorMessage}</p>
      {replyShare > 0 && (
        <Spotlight on={progress(frame, moments.confirmAt, 10)}>
          <div className="rounded-md bg-leaf-soft p-4 text-app-body">{reply}</div>
        </Spotlight>
      )}
    </ScreenCard>
  );
}

const SCROLL_FOR_REPLY = 150;

export function HubScreen({ moments }: { moments: HubMoments }) {
  const frame = useCurrentFrame();
  const exchangeIn = progress(frame, moments.exchangeAt, 14);
  const modelOn = progress(frame, moments.modelAt, 10);
  const scrolled = progress(frame, moments.replyAt - 4, 18);
  return (
    <div className="flex size-full flex-col gap-4 px-5 pt-14" style={{ translate: `0 ${-SCROLL_FOR_REPLY * scrolled}px` }}>
      <p className="text-app-title font-bold">Leaf Doctor Hub</p>
      <ScreenCard tone="leaf" className="flex flex-col gap-4">
        <span className="flex items-center gap-3 text-app-heading font-bold">
          <PulsingDot frame={frame} /> Listening for texts
        </span>
      </ScreenCard>
      <ServerCard offline={frame >= moments.offlineAt} />
      <Spotlight on={modelOn * (1 - progress(frame, moments.replyAt + 30, 12))}>
        <ModelReadyRow />
      </Spotlight>
      <div style={{ opacity: exchangeIn, translate: `0 ${(1 - exchangeIn) * 40}px` }}>
        <ExchangeCard frame={frame} moments={moments} />
      </div>
    </div>
  );
}
