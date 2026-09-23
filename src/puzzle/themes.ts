export interface SheetTheme {
  id: string;
  label: string;
  /** Original emoji styling only — no franchise artwork ships with the site. */
  glyphs: string[];
  /** Print accent for the sheet title. Empty = plain ink. */
  accent: string;
}

export const THEMES: SheetTheme[] = [
  { id: "classic", label: "Classic", glyphs: [], accent: "" },
  { id: "dragons", label: "Dragons", glyphs: ["🐉", "🔥", "🛡️", "🏰"], accent: "#b91c1c" },
  { id: "unicorns", label: "Unicorns", glyphs: ["🦄", "🌈", "⭐", "✨"], accent: "#a21caf" },
  { id: "fall", label: "Fall", glyphs: ["🍂", "🎃", "🍁", "🌰"], accent: "#c2410c" },
  { id: "winter", label: "Winter", glyphs: ["❄️", "⛄", "🧊", "✨"], accent: "#1d4ed8" },
  { id: "spring", label: "Spring", glyphs: ["🌸", "🐝", "🌷", "🦋"], accent: "#15803d" },
  { id: "summer", label: "Summer", glyphs: ["☀️", "🌊", "🍉", "🐚"], accent: "#0e7490" },
  { id: "holiday", label: "Holiday", glyphs: ["🎄", "🎁", "⛄", "✨"], accent: "#b91c1c" },
];

/** A banner row: the theme's glyphs cycled to n slots. */
export function banner(theme: SheetTheme, n = 12): string[] {
  if (theme.glyphs.length === 0) return [];
  return Array.from({ length: n }, (_, i) => theme.glyphs[i % theme.glyphs.length]);
}
