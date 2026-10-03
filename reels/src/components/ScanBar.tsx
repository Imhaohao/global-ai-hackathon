type ScanBarProps = {
  /** Where the bar sits, 0 at the top of its box and 1 at the bottom. */
  at: number;
  intensity?: number;
  trail?: number;
};

/** A line of rust light sweeping down, with a lit wash trailing behind it. */
export function ScanBar({ at, intensity = 1, trail = 0.22 }: ScanBarProps) {
  const position = `${at * 100}%`;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ opacity: intensity }}>
      <div
        className="absolute inset-x-0 mix-blend-screen"
        style={{ top: `calc(${position} - ${trail * 100}%)`, height: `${trail * 100}%`, background: "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--brand-rust-glow) 12%, transparent) 60%, color-mix(in srgb, var(--brand-rust) 38%, transparent))" }}
      />
      <div
        className="absolute -inset-x-[5%] h-[5px]"
        style={{ top: position, translate: "0 -50%", background: "#fff1d9", boxShadow: "0 0 10px 3px var(--brand-rust-glow), 0 0 40px 12px color-mix(in srgb, var(--brand-rust) 70%, transparent), 0 0 120px 34px color-mix(in srgb, var(--brand-rust) 30%, transparent)" }}
      />
    </div>
  );
}
