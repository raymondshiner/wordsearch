import type { GenerateResult } from "@/engine";
import { GridPreview } from "./GridPreview";
import { banner, type SheetTheme } from "./themes";

function Banner({ theme }: { theme: SheetTheme }) {
  const glyphs = banner(theme);
  if (glyphs.length === 0) return null;
  return (
    <div aria-hidden="true" className="flex justify-between text-base leading-none select-none">
      {glyphs.map((g, i) => (
        <span key={i}>{g}</span>
      ))}
    </div>
  );
}

function SheetHeader({ title, seed, theme }: { title: string; seed: number; theme: SheetTheme }) {
  return (
    <div className="flex items-baseline justify-between font-mono text-xs tracking-widest uppercase">
      <span className="font-bold" style={theme.accent ? { color: theme.accent } : undefined}>
        {title}
      </span>
      <span>№ {seed}</span>
    </div>
  );
}

/** One puzzle sheet + its answer key — shared by the print stylesheet and the preview dialog. */
export function SheetPages({
  result,
  theme,
  pageClassName = "",
}: {
  result: GenerateResult;
  theme: SheetTheme;
  pageClassName?: string;
}) {
  const words = result.placements.map((p) => p.word).sort();
  return (
    <>
      <div className={`flex flex-col gap-5 ${pageClassName}`}>
        <Banner theme={theme} />
        <SheetHeader title="Word Search" seed={result.settings.seed} theme={theme} />
        <GridPreview result={result} showAnswers={false} />
        <div className="border-t border-dashed pt-4">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 font-mono text-sm">
            {words.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
        </div>
        <Banner theme={theme} />
      </div>
      <div className={`print-page-break flex flex-col gap-5 pt-2 ${pageClassName}`}>
        <Banner theme={theme} />
        <SheetHeader title="Answer key" seed={result.settings.seed} theme={theme} />
        <GridPreview result={result} showAnswers />
      </div>
    </>
  );
}

/** Rendered only under `@media print`. */
export function PrintSheet({ result, theme }: { result: GenerateResult; theme: SheetTheme }) {
  return (
    <div className="print-sheet mx-auto hidden max-w-[7in] flex-col gap-6 print:flex">
      <SheetPages result={result} theme={theme} />
    </div>
  );
}
