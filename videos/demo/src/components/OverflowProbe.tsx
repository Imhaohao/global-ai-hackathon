import { useLayoutEffect } from "react";
import { useCurrentFrame } from "remotion";

/**
 * Fails the render on any element marked data-box whose content is larger than the box. Rendered only when the
 * composition gets { checkOverflow: true }; scripts/checkOverflow.ts runs that render and reports the error.
 */
export function OverflowProbe({ alwaysFail = false }: { alwaysFail?: boolean }) {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    const spills = [...document.querySelectorAll<HTMLElement>("[data-box]")]
      .filter((box) => box.scrollWidth > box.clientWidth + 1 || box.scrollHeight > box.clientHeight + 1)
      .map((box) => `${box.dataset.box} ${box.scrollWidth}x${box.scrollHeight} in ${box.clientWidth}x${box.clientHeight}`);
    if (alwaysFail) spills.push(`self-test with ${document.querySelectorAll("[data-box]").length} boxes`);
    if (spills.length) throw new Error(`OVERFLOW frame ${frame}: ${spills.join("; ")}`);
  }, [frame, alwaysFail]);
  return null;
}
