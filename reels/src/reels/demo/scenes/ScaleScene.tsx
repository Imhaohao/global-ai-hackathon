import { MapPin } from "@phosphor-icons/react";
import { useCurrentFrame } from "remotion";
import { FinePrint } from "../../../components/FinePrint";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { Slab } from "../../../components/Slab";
import { scatterSpores, Spore } from "../../../components/Spore";
import { FloorShade, Vignette } from "../../../components/Surface";
import { progress } from "../../../lib/ease";
import { wordAt } from "../timeline";

const REPORTS = scatterSpores(29, 22, { x: 120, y: 640, width: 840, height: 640 }, [16, 26], 60);
const mapAt = wordAt("scale", "map");

function Report({ x, y, size, at }: { x: number; y: number; size: number; at: number }) {
  const frame = useCurrentFrame();
  const lit = progress(frame, at, 10);
  const ripple = ((frame - at) % 40) / 40;
  if (lit <= 0) return null;
  return (
    <>
      <span
        className="absolute rounded-full"
        style={{ left: x, top: y, width: size * 5 * ripple + size, height: size * 5 * ripple + size, translate: "-50% -50%", boxShadow: `0 0 0 3px color-mix(in srgb, var(--brand-rust-glow) ${60 * (1 - ripple)}%, transparent)` }}
      />
      <Spore x={x} y={y} size={size * lit} />
    </>
  );
}

function Contours() {
  const frame = useCurrentFrame();
  const drawn = progress(frame, mapAt - 6, 30);
  return (
    <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden style={{ opacity: 0.28 * drawn }}>
      {Array.from({ length: 9 }, (_, index) => (
        <path
          key={index}
          d={`M -40 ${640 + index * 80} C 300 ${560 + index * 86}, 700 ${720 + index * 70}, 1120 ${620 + index * 84}`}
          fill="none"
          stroke="#f7f5f0"
          strokeWidth={2}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset={1 - drawn}
        />
      ))}
    </svg>
  );
}

export function ScaleScene({ length }: { length: number }) {
  const frame = useCurrentFrame();
  const header = progress(frame, 4, 14);
  return (
    <Punch flash={0.4}>
      <Photo src="images/valley-aerial.jpg" from={{ scale: 1.28 }} to={{ scale: 1.04 }} duration={length} origin="60% 60%" />
      <Vignette strength={0.4} />
      <FloorShade strength={0.45} from={60} />
      <Contours />
      {REPORTS.map((point, index) => (
        <Report key={index} x={point.x} y={point.y} size={point.size} at={14 + point.delay} />
      ))}
      <div className="absolute inset-x-safe-side top-[200px] flex flex-col items-start gap-3" style={{ opacity: header, translate: `0 ${(1 - header) * 24}px` }}>
        <Slab className="flex items-center gap-4 px-7 py-5">
          <MapPin size={48} weight="fill" className="text-leaf" />
          <span className="display-headline text-title">Cooperative rust map</span>
        </Slab>
        <Slab tone="night" className="px-5 py-3 text-label font-bold">Next step, not built yet</Slab>
        <FinePrint at={24} tone="light" className="max-w-[760px]">
          Each consented report already stores its time, place and farm section. The valley picture was made with AI.
        </FinePrint>
      </div>
    </Punch>
  );
}
