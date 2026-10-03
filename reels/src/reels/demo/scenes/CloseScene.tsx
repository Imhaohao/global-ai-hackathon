import { Sequence, useCurrentFrame } from "remotion";
import { EndCard } from "../../../components/EndCard";
import { Photo } from "../../../components/Photo";
import { Punch } from "../../../components/Punch";
import { FloorShade } from "../../../components/Surface";
import { progress } from "../../../lib/ease";
import { END_CARD_FROM, sceneFrom } from "../timeline";
import { CreditsBlock } from "./CreditsBlock";

const cardFrom = END_CARD_FROM - sceneFrom("close");

function NoorReads({ length }: { length: number }) {
  return (
    <Punch flash={0.4}>
      <Photo src="images/noor-reads.jpg" from={{ scale: 1.02 }} to={{ scale: 1.14 }} duration={length} origin="55% 30%" />
      <FloorShade strength={0.4} from={55} />
    </Punch>
  );
}

function Card() {
  const frame = useCurrentFrame();
  return (
    <EndCard>
      <div style={{ opacity: progress(frame, 70, 20) }}>
        <CreditsBlock />
      </div>
    </EndCard>
  );
}

export function CloseScene({ length }: { length: number }) {
  return (
    <>
      <Sequence durationInFrames={cardFrom + 12} layout="none">
        <NoorReads length={cardFrom + 12} />
      </Sequence>
      <Sequence from={cardFrom} durationInFrames={length - cardFrom} layout="none">
        <Card />
      </Sequence>
    </>
  );
}
