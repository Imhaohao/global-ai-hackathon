import { Color } from "three";

const themeColorTokens = {
  paper: "--brand-paper",
  ink: "--brand-ink",
  rust: "--brand-rust",
  rustGlow: "--brand-rust-glow",
  leaf: "--brand-leaf",
} as const;

export type ThemeColorName = keyof typeof themeColorTokens;
export type ThemeColors = Record<ThemeColorName, Color>;

export function readThemeColors(): ThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const entries = Object.entries(themeColorTokens).map(([name, token]) => [name, new Color(styles.getPropertyValue(token).trim())]);
  return Object.fromEntries(entries) as ThemeColors;
}
