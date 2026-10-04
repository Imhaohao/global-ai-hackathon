import type { FarmerGridColours } from "../components/FarmerGrid";

/** The shared grid drawn in this video's tokens. */
export const GRID_COLOURS: Partial<FarmerGridColours> = {
  farmer: "var(--color-text-muted)",
  device: "var(--color-text-faint)",
  signal: "var(--color-text-muted)",
  signalLost: "var(--brand-rust)",
  lit: "var(--color-live)",
  leaf: "var(--brand-leaf)",
  spore: "var(--brand-rust-glow)",
};
