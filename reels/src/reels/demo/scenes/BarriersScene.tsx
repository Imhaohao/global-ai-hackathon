import { DeviceMobile, Lightning } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { Sequence, useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Punch } from "../../../components/Punch";
import { RevealLines } from "../../../components/RevealLines";
import { CountUp } from "../../../components/Stat";
import { Paper } from "../../../components/Surface";
import { glide, progress } from "../../../lib/ease";
import { SOURCES } from "../credits";
import { wordAt } from "../timeline";

const word = (text: string) => wordAt("barriers", text);
const offlineFrom = word("and") - 6;

const RING_FARMERS = 600;

function OfficerRing({ at }: { at: number }) {
  const frame = useCurrentFrame();
  return (
    <svg width={720} height={720} viewBox="-360 -360 720 720" className="block" aria-label="One officer dot surrounded by 600 farmer dots">
      {Array.from({ length: RING_FARMERS }, (_, index) => {
        const ring = Math.floor(Math.sqrt(index / 6));
        const angle = index * 2.39996;
        const radius = 64 + Math.sqrt(index) * 11.8;
        const shown = progress(frame, at + ring * 1.2, 12, glide);
        return <circle key={index} cx={Math.cos(angle) * radius * shown} cy={Math.sin(angle) * radius * shown} r={5} fill="var(--brand-ink-faint)" opacity={shown * 0.8} />;
      })}
      <circle r={30} fill="var(--brand-leaf)" />
    </svg>
  );
}

function LocalHelp() {
  return (
    <Punch flash={0.5}>
      <Paper>
        <div className="absolute inset-x-0 top-[130px] flex justify-center">
          <OfficerRing at={2} />
        </div>
        <div className="absolute inset-x-safe-side top-[880px] flex flex-col gap-4">
          <span className="display-poster text-figure figures text-leaf">1 : 600</span>
          <RevealLines lines={["Kenya aims for one extension officer", "for every 600 farmers by 2029"]} at={6} className="text-lead font-bold text-ink" />
          <FinePrint at={18}>
            The same policy says the ratio of extension staff to farmers “has not improved”. {SOURCES.extensionTarget.source}.
          </FinePrint>
        </div>
      </Paper>
    </Punch>
  );
}

type FigureRowProps = { icon: Icon; value: number; label: string; source: string; at: number };

function FigureRow({ icon: Glyph, value, label, source, at }: FigureRowProps) {
  const frame = useCurrentFrame();
  const shown = progress(frame, at, 14);
  return (
    <div className="flex flex-col gap-2" style={{ opacity: shown, translate: `0 ${(1 - shown) * 30}px` }}>
      <div className="flex items-center gap-6">
        <Glyph size={96} weight="duotone" className="shrink-0 text-ink" />
        <span className="display-poster text-figure text-ink">
          <CountUp value={value} at={at} duration={34} suffix="%" />
        </span>
      </div>
      <p className="text-lead font-bold text-ink text-pretty">{label}</p>
      <FinePrint at={at + 12}>{source}</FinePrint>
    </div>
  );
}

function NoSignal() {
  return (
    <Punch flash={0.5}>
      <Paper>
        <div className="absolute inset-x-safe-side top-[200px] flex flex-col gap-16">
          <FigureRow
            icon={DeviceMobile}
            value={38.4}
            label="of rural adults in Kenya use a basic text phone as their main phone"
            source={`${SOURCES.basicPhone.source}, ${SOURCES.basicPhone.year}`}
            at={4}
          />
          <FigureRow
            icon={Lightning}
            value={67.1}
            label="of rural Kenyans have electricity, so about a third do not"
            source={`${SOURCES.ruralPower.source}, ${SOURCES.ruralPower.year}`}
            at={34}
          />
        </div>
      </Paper>
    </Punch>
  );
}

export function BarriersScene({ length }: { length: number }) {
  return (
    <>
      <Sequence durationInFrames={offlineFrom} layout="none">
        <LocalHelp />
      </Sequence>
      <Sequence from={offlineFrom} durationInFrames={length - offlineFrom} layout="none">
        <NoSignal />
      </Sequence>
    </>
  );
}
