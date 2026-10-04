import { useCurrentFrame } from "remotion";
import { leave, progress } from "../lib/ease";

type PartHeadingProps = { part: 1 | 2 | 3 | 4; title: string; exitAt?: number };

/** The README's own step number and name, so a viewer can find the part in the repository. */
export function PartHeading({ part, title, exitAt }: PartHeadingProps) {
  const frame = useCurrentFrame();
  const shown = progress(frame, 0, 16) - (exitAt === undefined ? 0 : progress(frame, exitAt, 10, leave));
  return (
    <div className="absolute left-[96px] top-[64px] flex items-baseline gap-5" style={{ opacity: shown, translate: `${(1 - shown) * -30}px 0` }}>
      <span className="display-headline text-headline text-live figures">{part}</span>
      <span className="display-headline text-title text-text">{title}</span>
    </div>
  );
}
