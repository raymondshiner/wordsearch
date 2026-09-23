export interface CleanResult {
  words: string[];
  /** Human-readable notes about what was normalized away. */
  rejected: { input: string; reason: string }[];
}

export const MIN_WORD_LENGTH = 3;

/**
 * Normalize raw user input into engine-ready words:
 * uppercase, letters only, deduped, length-bounded to the grid.
 */
export function cleanWords(raw: string[], gridSize: number): CleanResult {
  const seen = new Set<string>();
  const words: string[] = [];
  const rejected: CleanResult["rejected"] = [];
  for (const input of raw) {
    const word = input.toUpperCase().replace(/[^A-Z]/g, "");
    if (word.length === 0) continue;
    if (word.length < MIN_WORD_LENGTH) {
      rejected.push({ input, reason: `shorter than ${MIN_WORD_LENGTH} letters` });
      continue;
    }
    if (word.length > gridSize) {
      rejected.push({ input, reason: `longer than the ${gridSize}×${gridSize} grid` });
      continue;
    }
    if (seen.has(word)) continue;
    seen.add(word);
    words.push(word);
  }
  return { words, rejected };
}

/** Honest rule of thumb: letters should stay under ~65% of the grid. */
export function capacity(gridSize: number): number {
  return Math.floor(gridSize * gridSize * 0.65);
}

export function overCapacity(words: string[], gridSize: number): boolean {
  const letters = words.reduce((n, w) => n + w.length, 0);
  return letters > capacity(gridSize);
}
