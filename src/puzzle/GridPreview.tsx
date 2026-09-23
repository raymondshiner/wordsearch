import type { CSSProperties } from "react";
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

/** Highlighter strokes — one capsule per found word, drawn like a real marker pass. */
function MarkerOverlay({ result }: { result: GenerateResult }) {
  const size = result.settings.size;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox={`0 0 ${size} ${size}`}
      // Cells can end up non-square when line-height beats aspect-square at
      // narrow widths — stretch the coordinate space to the real grid box.
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {result.placements.map((p, i) => {
        const { dx, dy } = DELTAS[p.dir];
        const x1 = p.col + 0.5;
        const y1 = p.row + 0.5;
        const x2 = p.col + dx * (p.word.length - 1) + 0.5;
        const y2 = p.row + dy * (p.word.length - 1) + 0.5;
        const len = Math.hypot(x2 - x1, y2 - y1) + 0.8;
        return (
          <line
            key={p.word}
            className="marker-stroke"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--marker)"
            strokeWidth={0.78}
            strokeLinecap="round"
            strokeDasharray={len}
            style={{
              "--stroke-len": String(len),
              "--stroke-delay": `${i * 0.07}s`,
            } as CSSProperties}
          />
        );
      })}
    </svg>
  );
}

export function GridPreview({ result, showAnswers }: { result: GenerateResult; showAnswers: boolean }) {
  const answers = showAnswers ? answerCells(result) : null;
  return (
    <div className="relative w-full max-w-135">
      {showAnswers && <MarkerOverlay result={result} />}
      <div
        role="grid"
        aria-label={`${result.settings.size} by ${result.settings.size} word search grid`}
        className="relative grid w-full font-mono select-none"
        style={{ gridTemplateColumns: `repeat(${result.settings.size}, minmax(0, 1fr))` }}
      >
        {result.grid.map((row, r) =>
          row.map((letter, c) => {
            const hit = answers?.has(`${r},${c}`);
            return (
              <div
                key={`${r},${c}`}
                role="gridcell"
                className={`relative flex aspect-square items-center justify-center text-[clamp(0.5rem,2vw,0.95rem)] leading-none ${
                  hit ? "font-bold text-marker-ink" : answers ? "text-foreground/35" : "text-foreground/85"
                }`}
              >
                {letter}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
