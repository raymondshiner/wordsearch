import type { GenerateResult } from "@/engine";

const DELTAS: Record<string, { dx: number; dy: number }> = {
  E: { dx: 1, dy: 0 }, S: { dx: 0, dy: 1 }, SE: { dx: 1, dy: 1 }, NE: { dx: 1, dy: -1 },
  W: { dx: -1, dy: 0 }, N: { dx: 0, dy: -1 }, NW: { dx: -1, dy: -1 }, SW: { dx: -1, dy: 1 },
};

export function answerCells(result: GenerateResult): Set<string> {
  const cells = new Set<string>();
  for (const p of result.placements) {
    const { dx, dy } = DELTAS[p.dir];
    for (let i = 0; i < p.word.length; i++) cells.add(`${p.row + dy * i},${p.col + dx * i}`);
  }
  return cells;
}

export function GridPreview({ result, showAnswers }: { result: GenerateResult; showAnswers: boolean }) {
  const answers = showAnswers ? answerCells(result) : null;
  return (
    <div
      role="grid"
      aria-label={`${result.settings.size} by ${result.settings.size} word search grid`}
      className="grid w-full max-w-135 gap-px font-mono select-none"
      style={{ gridTemplateColumns: `repeat(${result.settings.size}, minmax(0, 1fr))` }}
    >
      {result.grid.map((row, r) =>
        row.map((letter, c) => {
          const hit = answers?.has(`${r},${c}`);
          return (
            <div
              key={`${r},${c}`}
              role="gridcell"
              className={`flex aspect-square items-center justify-center rounded-sm text-[clamp(0.5rem,2vw,0.95rem)] ${
                hit ? "bg-primary text-primary-foreground font-bold" : "text-foreground/80"
              }`}
            >
              {letter}
            </div>
          );
        }),
      )}
    </div>
  );
}
