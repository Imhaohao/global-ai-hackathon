/**
 * Leaf Doctor type families, all from Google Fonts.
 *
 * Archivo: a grotesque with a width axis (62-125) and weight axis (100-900). Condensed and heavy, it sets the
 * poster headline that sits behind the slope; at normal width it sets headings.
 * Atkinson Hyperlegible Next: drawn by the Braille Institute so confusable letters and digits (1 l I, 0 O, 5 S)
 * stay distinct at small sizes and on poor screens. Body copy, captions and every quoted figure.
 * Atkinson Hyperlegible Mono: only for genuine data, such as a raw SMS, a field name or model output.
 */
export type BrandFont = {
  family: string;
  weights: number[];
  axes?: Record<string, [number, number]>;
  role: "display" | "body" | "data";
};

export const displayFont: BrandFont = {
  family: "Archivo",
  weights: [500, 700, 800, 900],
  axes: { wdth: [62, 125], wght: [100, 900] },
  role: "display",
};

export const bodyFont: BrandFont = {
  family: "Atkinson Hyperlegible Next",
  weights: [400, 500, 700],
  axes: { wght: [200, 800] },
  role: "body",
};

export const dataFont: BrandFont = {
  family: "Atkinson Hyperlegible Mono",
  weights: [400, 600],
  axes: { wght: [200, 800] },
  role: "data",
};

export const brandFonts = [displayFont, bodyFont, dataFont] as const;
