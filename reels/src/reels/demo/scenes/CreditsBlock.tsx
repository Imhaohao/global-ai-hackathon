import { GENERATED_CREDIT, PHOTO_CREDITS, SOUND_CREDITS, SOURCES, STAGE_CREDIT } from "../credits";

const figures = [SOURCES.farmJobs, SOURCES.basicPhone, SOURCES.ownPhone, SOURCES.extensionTarget];

/** The fine print every frame of the reel leans on: where the figures and pictures came from. */
export function CreditsBlock() {
  return (
    <div className="flex flex-col gap-4 text-fineprint text-ink-muted">
      <p className="font-bold text-ink">This is a prototype, and its field accuracy and speed on a cheap phone are not measured yet.</p>
      <p>
        Figures:{" "}
        {figures.map((source) => `${source.source}, ${source.year}`).filter((value, index, all) => all.indexOf(value) === index).join("; ")}.
      </p>
      <p>
        Photos: {PHOTO_CREDITS.map((credit) => `${credit.who}, ${credit.licence}`).join("; ")}, via Wikimedia Commons.
      </p>
      <p>{GENERATED_CREDIT.what}: {GENERATED_CREDIT.who}. {STAGE_CREDIT.what}: {STAGE_CREDIT.who}.</p>
      <p>
        {SOUND_CREDITS.map((credit) => `${credit.what}: ${credit.who}`).join(". ")}.
      </p>
    </div>
  );
}
