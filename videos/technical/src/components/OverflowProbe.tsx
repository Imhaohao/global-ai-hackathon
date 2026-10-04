import { useEffect, useState } from "react";
import { continueRender, delayRender, getInputProps, useCurrentFrame } from "remotion";

const TOLERANCE = 2;

function textElements(box: Element) {
  return [box, ...box.querySelectorAll("*")].filter((element) =>
    [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()),
  );
}

function overflowsIn(box: Element) {
  const outer = box.getBoundingClientRect();
  return textElements(box)
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.left < outer.left - TOLERANCE || rect.right > outer.right + TOLERANCE || rect.top < outer.top - TOLERANCE || rect.bottom > outer.bottom + TOLERANCE)
    .map(({ element }) => element.textContent?.trim() ?? "");
}

/**
 * With the input prop checkOverflow, logs "OVERFLOW <frame> <box>: <text>" for every text that crosses the edge of
 * its container (any element marked data-box). scripts/checkOverflow.ts renders stills and fails on these lines.
 */
export function OverflowProbe() {
  const frame = useCurrentFrame();
  const enabled = Boolean((getInputProps() as { checkOverflow?: boolean }).checkOverflow);
  const [handle] = useState(() => (enabled ? delayRender("overflow probe") : null));
  useEffect(() => {
    if (handle === null) return;
    requestAnimationFrame(() => {
      document.querySelectorAll("[data-box]").forEach((box) => {
        overflowsIn(box).forEach((text) => console.log(`OVERFLOW ${frame} ${box.getAttribute("data-box")}: ${text}`));
      });
      console.log(`PROBED ${frame}`);
      continueRender(handle);
    });
  }, [frame, handle]);
  return null;
}
