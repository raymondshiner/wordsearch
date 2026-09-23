import type { Direction, GenerateSettings } from "./types";

const ALL: Direction[] = [
  { name: "E", dx: 1, dy: 0 },
  { name: "S", dx: 0, dy: 1 },
  { name: "SE", dx: 1, dy: 1 },
  { name: "NE", dx: 1, dy: -1 },
  { name: "W", dx: -1, dy: 0 },
  { name: "N", dx: 0, dy: -1 },
  { name: "NW", dx: -1, dy: -1 },
  { name: "SW", dx: -1, dy: 1 },
];

const BACKWARDS = new Set(["W", "N", "NW", "SW"]);
const DIAGONAL = new Set(["SE", "NE", "NW", "SW"]);

export function enabledDirections(
  settings: Pick<GenerateSettings, "allowBackwards" | "allowDiagonals">,
): Direction[] {
  return ALL.filter(
    (d) =>
      (settings.allowBackwards || !BACKWARDS.has(d.name)) &&
      (settings.allowDiagonals || !DIAGONAL.has(d.name)),
  );
}
