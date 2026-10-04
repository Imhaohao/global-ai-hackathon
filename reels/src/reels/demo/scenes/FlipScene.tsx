import { Sequence } from "remotion";
import { wordAt } from "../timeline";
import { Arrival, ARRIVAL_FRAMES, HubUi } from "./HubParts";
import { TEXT_TIMING, TextScene } from "./TextScene";

const word = (text: string) => wordAt("flip", text);

export const FLIP_TIMING = { arrivalFrom: TEXT_TIMING.launchAt + 8, hubFrom: word("and") - 8, arrivalFrames: ARRIVAL_FRAMES } as const;

export function FlipScene({ length }: { length: number }) {
  const { arrivalFrom, hubFrom } = FLIP_TIMING;
  return (
    <>
      <Sequence durationInFrames={arrivalFrom} layout="none">
        <TextScene />
      </Sequence>
      <Sequence from={arrivalFrom} durationInFrames={hubFrom - arrivalFrom} layout="none">
        <Arrival length={hubFrom - arrivalFrom} labelAt={word("local") - arrivalFrom - 10} />
      </Sequence>
      <Sequence from={hubFrom} durationInFrames={length - hubFrom} layout="none">
        <HubUi moments={{ modelAt: word("model") - hubFrom - 4, replyAt: word("answers") - hubFrom }} />
      </Sequence>
    </>
  );
}
