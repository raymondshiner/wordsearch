import { enabledDirections } from "./directions";
import { createRng, randInt, shuffle, type Rng } from "./rng";
import type { Direction, GenerateResult, GenerateSettings, Placement } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Full restarts attempted before accepting the best partial result. */
const MAX_ATTEMPTS = 12;

type Grid = (string | null)[][];

function emptyGrid(size: number): Grid {
  return Array.from({ length: size }, () => Array<string | null>(size).fill(null));
}

function canPlace(grid: Grid, word: string, row: number, col: number, dir: Direction): boolean {
  const size = grid.length;
  const endRow = row + dir.dy * (word.length - 1);
  const endCol = col + dir.dx * (word.length - 1);
  if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) return false;
  for (let i = 0; i < word.length; i++) {
    const cell = grid[row + dir.dy * i][col + dir.dx * i];
    if (cell !== null && cell !== word[i]) return false;
  }
  return true;
}

function place(grid: Grid, word: string, row: number, col: number, dir: Direction): void {
  for (let i = 0; i < word.length; i++) {
    grid[row + dir.dy * i][col + dir.dx * i] = word[i];
  }
}

/** Try one full greedy pass; longest words first, random legal position per word. */
function attempt(
  words: string[],
  settings: GenerateSettings,
  rng: Rng,
): { grid: Grid; placements: Placement[]; unplaced: string[] } {
  const dirs = enabledDirections(settings);
  const grid = emptyGrid(settings.size);
  const placements: Placement[] = [];
  const unplaced: string[] = [];
  const ordered = [...words].sort((a, b) => b.length - a.length);

  for (const word of ordered) {
    const candidates: { row: number; col: number; dir: Direction }[] = [];
    for (const dir of shuffle(rng, dirs)) {
      for (let row = 0; row < settings.size; row++) {
        for (let col = 0; col < settings.size; col++) {
          if (canPlace(grid, word, row, col, dir)) candidates.push({ row, col, dir });
        }
      }
    }
    if (candidates.length === 0) {
      unplaced.push(word);
      continue;
    }
    const pick = candidates[randInt(rng, candidates.length)];
    place(grid, word, pick.row, pick.col, pick.dir);
    placements.push({ word, row: pick.row, col: pick.col, dir: pick.dir.name });
  }
  return { grid, placements, unplaced };
}

export function generate(words: string[], settings: GenerateSettings): GenerateResult {
  const rng = createRng(settings.seed);
  let best: ReturnType<typeof attempt> | null = null;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const result = attempt(words, settings, rng);
    if (best === null || result.unplaced.length < best.unplaced.length) best = result;
    if (best.unplaced.length === 0) break;
  }
  const { grid, placements, unplaced } = best!;
  const filled = grid.map((rowCells) =>
    rowCells.map((cell) => cell ?? ALPHABET[randInt(rng, ALPHABET.length)]),
  );
  return { grid: filled, placements, unplaced, settings };
}
