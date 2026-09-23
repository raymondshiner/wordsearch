import { describe, expect, it } from "vitest";
import { enabledDirections } from "./directions";
import { generate } from "./generate";
import type { DirectionName, GenerateResult, GenerateSettings } from "./types";
import { capacity, cleanWords, overCapacity } from "./words";

const DELTAS: Record<DirectionName, { dx: number; dy: number }> = {
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  SE: { dx: 1, dy: 1 },
  NE: { dx: 1, dy: -1 },
  W: { dx: -1, dy: 0 },
  N: { dx: 0, dy: -1 },
  NW: { dx: -1, dy: -1 },
  SW: { dx: -1, dy: 1 },
};

function settings(overrides: Partial<GenerateSettings> = {}): GenerateSettings {
  return { size: 12, allowBackwards: true, allowDiagonals: true, seed: 42, ...overrides };
}

function readPlacement(result: GenerateResult, index: number): string {
  const { word, row, col, dir } = result.placements[index];
  const { dx, dy } = DELTAS[dir];
  let read = "";
  for (let i = 0; i < word.length; i++) read += result.grid[row + dy * i][col + dx * i];
  return read;
}

describe("placement correctness", () => {
  const words = ["TYPESCRIPT", "REACT", "VITE", "TAILWIND", "GRID"];

  it("places every word so the grid actually spells it", () => {
    const result = generate(words, settings());
    expect(result.unplaced).toEqual([]);
    expect(result.placements).toHaveLength(words.length);
    result.placements.forEach((p, i) => expect(readPlacement(result, i)).toBe(p.word));
  });

  it("fills every cell with a single uppercase letter", () => {
    const result = generate(words, settings());
    expect(result.grid).toHaveLength(12);
    for (const row of result.grid) {
      expect(row).toHaveLength(12);
      for (const cell of row) expect(cell).toMatch(/^[A-Z]$/);
    }
  });

  it("keeps placements inside the grid", () => {
    const result = generate(words, settings({ size: 10 }));
    for (const p of result.placements) {
      const { dx, dy } = DELTAS[p.dir];
      const endRow = p.row + dy * (p.word.length - 1);
      const endCol = p.col + dx * (p.word.length - 1);
      for (const v of [p.row, p.col, endRow, endCol]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(10);
      }
    }
  });
});

describe("overlap legality", () => {
  it("only overlaps words on identical letters", () => {
    // Dense list in a small grid forces overlaps; every placement must still read back.
    const words = ["STONE", "TONES", "NOTES", "ONSET", "SETON"];
    const result = generate(words, settings({ size: 7, seed: 7 }));
    result.placements.forEach((p, i) => expect(readPlacement(result, i)).toBe(p.word));
  });
});

describe("direction toggles", () => {
  it("respects allowBackwards=false and allowDiagonals=false", () => {
    const result = generate(["ALPHA", "BRAVO", "DELTA"], settings({ allowBackwards: false, allowDiagonals: false }));
    for (const p of result.placements) expect(["E", "S"]).toContain(p.dir);
  });

  it("respects diagonals without backwards", () => {
    const result = generate(["ALPHA", "BRAVO", "DELTA"], settings({ allowBackwards: false }));
    for (const p of result.placements) expect(["E", "S", "SE", "NE"]).toContain(p.dir);
  });

  it("enabledDirections returns all 8 when everything is on", () => {
    expect(enabledDirections({ allowBackwards: true, allowDiagonals: true })).toHaveLength(8);
    expect(enabledDirections({ allowBackwards: false, allowDiagonals: false })).toHaveLength(2);
  });
});

describe("determinism", () => {
  const words = ["MONAD", "FUNCTOR", "CLOSURE", "CURRY", "THUNK", "MEMO"];

  it("same seed produces an identical grid and placements", () => {
    const a = generate(words, settings({ seed: 123 }));
    const b = generate(words, settings({ seed: 123 }));
    expect(a.grid).toEqual(b.grid);
    expect(a.placements).toEqual(b.placements);
  });

  it("different seeds produce different grids", () => {
    const a = generate(words, settings({ seed: 1 }));
    const b = generate(words, settings({ seed: 2 }));
    expect(a.grid).not.toEqual(b.grid);
  });
});

describe("unplaceable words", () => {
  it("reports words that cannot fit instead of dropping them", () => {
    // 5-letter grid cannot hold three interlocking 5-letter words with no shared letters everywhere.
    const result = generate(["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF", "GGGGG"], settings({ size: 5, allowDiagonals: false, allowBackwards: false }));
    const accounted = result.placements.length + result.unplaced.length;
    expect(accounted).toBe(7);
    expect(result.unplaced.length).toBeGreaterThan(0);
  });

  it("terminates quickly on a pathological list", () => {
    const words = Array.from({ length: 30 }, (_, i) => "LONGPATHOLOGICAL".slice(0, 10 + (i % 5)));
    const start = performance.now();
    generate(words, settings({ size: 10 }));
    expect(performance.now() - start).toBeLessThan(2000);
  });
});

describe("word cleaning", () => {
  it("uppercases, strips non-letters, dedupes, and bounds length", () => {
    const { words, rejected } = cleanWords(["  react ", "re-act", "ab", "REACT", "abcdefghijklmnop", ""], 12);
    expect(words).toEqual(["REACT"]);
    expect(rejected).toHaveLength(2);
    expect(rejected[0].reason).toContain("shorter");
    expect(rejected[1].reason).toContain("longer");
  });

  it("capacity warns past ~65% letter density", () => {
    expect(capacity(10)).toBe(65);
    expect(overCapacity(["ABCDEFGHIJ"], 10)).toBe(false);
    expect(overCapacity(Array(7).fill("ABCDEFGHIJ"), 10)).toBe(true);
  });
});
