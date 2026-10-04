import { Warning } from "@phosphor-icons/react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Stage } from "../components/Stage";
import { Tag } from "../components/Tag";
import { SEED_RESULTS } from "../app/shots";
import { SCENES } from "../timeline";

/** The blurred farm behind the iPhone shots, and the "Demo registry" tag on the barcode results. */
export function AppStage() {
  const frame = useCurrentFrame();
  const onApp = frame >= SCENES.scan.from - 2 && frame < SCENES.seed.to + 2;
  const onOfficer = frame >= SCENES.officer.from - 2 && frame < SCENES.officer.to + 2;
  if (!onApp && !onOfficer) return null;
  return (
    <AbsoluteFill>
      <Stage backdrop="images/backdrop-farm.jpg">
        <div className="absolute" style={{ left: 1180, top: 760 }}>
          <Tag icon={<Warning size={44} weight="bold" />} tone="rust" from={SEED_RESULTS.from} to={SEED_RESULTS.to}>
            Demo registry
          </Tag>
        </div>
      </Stage>
    </AbsoluteFill>
  );
}
