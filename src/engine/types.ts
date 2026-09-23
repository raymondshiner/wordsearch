export type DirectionName = "E" | "S" | "SE" | "NE" | "W" | "N" | "NW" | "SW";

export interface Direction {
  name: DirectionName;
  dx: -1 | 0 | 1;
  dy: -1 | 0 | 1;
}

export interface GenerateSettings {
  /** Grid is size × size. */
  size: number;
  allowBackwards: boolean;
  allowDiagonals: boolean;
  seed: number;
}

export interface Placement {
  word: string;
  /** 0-indexed start cell. */
  row: number;
  col: number;
  dir: DirectionName;
}

export interface GenerateResult {
  /** size × size, uppercase letters, fully filled. */
  grid: string[][];
  placements: Placement[];
  /** Words the engine could not legally place — reported, never dropped silently. */
  unplaced: string[];
  settings: GenerateSettings;
}
