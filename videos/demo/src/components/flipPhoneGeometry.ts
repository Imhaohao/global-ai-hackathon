// Geometry of Noor's basic phone in phone units (twice its resting on-screen size). Pure data, so the OCR mask script
// can locate the keypad on every frame without rendering.
export const BODY = { width: 840, height: 1880, depth: 70, radius: 128 } as const;
export const LCD = { x: 120, y: 216, width: 600, height: 540 } as const;
export const EARPIECE = { x: 330, y: 92, width: 180, height: 26 } as const;
/** The printed-legend region (soft keys, call and end keys, keypad) that the word check masks. */
export const LEGEND_REGION = { x: 50, y: 810, width: 740, height: 1000 } as const;

export type KeyId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "*" | "0" | "#" | "call" | "end";

export const PAD: [KeyId, string][] = [
  ["1", ""], ["2", "abc"], ["3", "def"],
  ["4", "ghi"], ["5", "jkl"], ["6", "mno"],
  ["7", "pqrs"], ["8", "tuv"], ["9", "wxyz"],
  ["*", "+"], ["0", ""], ["#", ""],
];
export const PAD_TOP = 1130;
export const PAD_LEFT = 78;
export const KEY = { width: 214, height: 138, gapX: 31, gapY: 26 } as const;

/** Centre of a key in phone units, measured from the phone's top-left corner. */
export function keyCentre(key: KeyId): { x: number; y: number } {
  if (key === "call") return { x: 190, y: 1020 };
  if (key === "end") return { x: 650, y: 1020 };
  const index = PAD.findIndex(([id]) => id === key);
  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: PAD_LEFT + column * (KEY.width + KEY.gapX) + KEY.width / 2, y: PAD_TOP + row * (KEY.height + KEY.gapY) + KEY.height / 2 };
}

/** A point on the phone in units from its centre, for camera framing. */
export function fromCentre(point: { x: number; y: number }) {
  return { x: point.x - BODY.width / 2, y: point.y - BODY.height / 2 };
}
