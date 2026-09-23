import type { GenerateResult } from "@/engine";
import { GridPreview } from "./GridPreview";

function SheetHeader({ title, seed }: { title: string; seed: number }) {
  return (
    <div className="flex items-baseline justify-between font-mono text-xs tracking-widest uppercase">
      <span className="font-bold">{title}</span>
      <span>№ {seed}</span>
    </div>
  );
}

/** Rendered only under `@media print`: puzzle + word bank, answer key on page 2. */
export function PrintSheet({ result }: { result: GenerateResult }) {
  const words = result.placements.map((p) => p.word).sort();
  return (
    <div className="print-sheet mx-auto hidden max-w-[7in] flex-col gap-6 print:flex">
      <SheetHeader title="Word Search" seed={result.settings.seed} />
      <GridPreview result={result} showAnswers={false} />
      <div className="border-t border-dashed pt-4">
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 font-mono text-sm">
          {words.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
      </div>
      <div className="print-page-break flex flex-col gap-6 pt-2">
        <SheetHeader title="Answer key" seed={result.settings.seed} />
        <GridPreview result={result} showAnswers />
      </div>
    </div>
  );
}
