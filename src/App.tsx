import { useState } from "react";
import { Download, Eye, Moon, Plus, Printer, RefreshCw, SlidersHorizontal, Sun, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { capacity, generate } from "@/engine";
import { DIFFICULTY_LABELS } from "./puzzle/difficulty";
import { GridPreview } from "./puzzle/GridPreview";
import { PrintSheet, SheetPages } from "./puzzle/PrintSheet";
import { THEMES, banner, type SheetTheme } from "./puzzle/themes";
import { usePuzzle } from "./puzzle/usePuzzle";
import { useTheme } from "./theme";

function Wordmark() {
  const tile = (letter: string, key: string) => (
    <span
      key={key}
      className="border-border bg-card relative flex size-7 items-center justify-center rounded-sm border text-sm font-bold sm:size-8 sm:text-base"
    >
      {letter}
    </span>
  );
  return (
    <h1 aria-label="Word Search Generator" className="flex flex-wrap items-center gap-3 font-mono">
      <span aria-hidden="true" className="flex gap-1">
        {[..."WORD"].map((l, i) => tile(l, `w${i}`))}
      </span>
      <span aria-hidden="true" className="relative flex gap-1">
        <span className="bg-marker absolute -inset-x-2 -inset-y-1 -rotate-1 rounded-full" />
        {[..."SEARCH"].map((l, i) => tile(l, `s${i}`))}
      </span>
    </h1>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-muted-foreground font-mono text-xs font-semibold tracking-[0.2em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

const DEMO = generate(["TYPE", "YOUR", "WORDS"], {
  size: 8,
  allowBackwards: false,
  allowDiagonals: true,
  seed: 11,
});

export default function App() {
  const puzzle = usePuzzle();
  const { state, settings, cleaned, tooDense, result } = puzzle;
  const { dark, toggle } = useTheme();
  const [showAnswers, setShowAnswers] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [sheetTheme, setSheetTheme] = useState<SheetTheme>(THEMES[0]);

  function submitWord() {
    const error = puzzle.addWord(draft);
    setInputError(error);
    if (!error) setDraft("");
  }

  async function exportPdf() {
    if (!result) return;
    setExporting(true);
    try {
      const [{ pdf }, { PuzzlePdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./puzzle/pdf/PuzzlePdf"),
      ]);
      const blob = await pdf(<PuzzlePdf result={result} title="Word Search" />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wordsearch-${result.settings.seed}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
    <div className="mx-auto min-h-dvh max-w-6xl px-4 py-8 sm:px-6 print:hidden">
      <header className="mb-10 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Wordmark />
          <p className="text-muted-foreground">
            Type your words, tune the difficulty, print the puzzle.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={toggle}
          className="shrink-0"
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </header>

      <main className="grid items-start gap-10 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="flex flex-col gap-8">
          <Panel title="Words">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitWord();
              }}
            >
              <Input
                aria-label="Add a word"
                placeholder="Type a word…"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (inputError) setInputError(null);
                }}
                className="bg-card font-mono uppercase placeholder:font-sans placeholder:normal-case"
              />
              <Button type="submit" variant="outline" className="bg-card gap-1.5" disabled={!draft.trim()}>
                <Plus className="size-4" /> Add
              </Button>
            </form>
            {inputError && (
              <p role="alert" className="text-destructive text-sm">
                {inputError}
              </p>
            )}
            {state.words.length > 0 && (
              <ul aria-label="Your words" className="flex flex-wrap gap-1.5">
                {state.words.map((word) => (
                  <li
                    key={word}
                    className="bg-secondary flex items-center gap-1 rounded-full py-1 pr-1 pl-3 font-mono text-sm"
                  >
                    {word}
                    <button
                      type="button"
                      aria-label={`Remove ${word}`}
                      onClick={() => puzzle.removeWord(word)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-baseline justify-between">
              <p className="text-muted-foreground font-mono text-xs">
                {state.words.length} {state.words.length === 1 ? "word" : "words"} · room for
                ~{capacity(settings.size)} letters
              </p>
              {state.words.length > 1 && (
                <button
                  type="button"
                  onClick={puzzle.clearWords}
                  className="text-muted-foreground hover:text-foreground font-mono text-xs underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
            </div>
            {cleaned.rejected.length > 0 && (
              <Alert>
                <AlertTitle>Some words don't fit this grid</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4">
                    {cleaned.rejected.map((r) => (
                      <li key={r.input}>
                        “{r.input.trim()}” — {r.reason}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {tooDense && (
              <Alert>
                <AlertTitle>That's a lot of letters</AlertTitle>
                <AlertDescription>
                  Past the comfortable fit for a {settings.size}×{settings.size} grid. Placement
                  still runs — anything that doesn't fit is listed under the puzzle.
                </AlertDescription>
              </Alert>
            )}
          </Panel>

          <Panel title="Difficulty">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="difficulty" className="font-mono font-bold">
                {DIFFICULTY_LABELS[state.dial - 1]}
              </Label>
              <span className="text-muted-foreground font-mono text-sm">
                {settings.size}×{settings.size}
              </span>
            </div>
            <Slider
              id="difficulty"
              aria-label="Difficulty"
              min={1}
              max={5}
              step={1}
              value={[state.dial]}
              onValueChange={([v]) => puzzle.setDial(v)}
            />
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="-ml-2 gap-2">
                  <SlidersHorizontal className="size-4" /> Advanced
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="flex flex-col gap-4 pt-3">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="size" className="shrink-0">
                    Grid size: {settings.size}
                  </Label>
                  <Slider
                    id="size"
                    aria-label="Grid size"
                    className="max-w-40"
                    min={8}
                    max={26}
                    step={1}
                    value={[settings.size]}
                    onValueChange={([v]) => puzzle.setOverride({ size: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="backwards">Backwards words</Label>
                  <Switch
                    id="backwards"
                    checked={settings.allowBackwards}
                    onCheckedChange={(v) => puzzle.setOverride({ allowBackwards: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="diagonals">Diagonal words</Label>
                  <Switch
                    id="diagonals"
                    checked={settings.allowDiagonals}
                    onCheckedChange={(v) => puzzle.setOverride({ allowDiagonals: v })}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Panel>

          <Panel title="Sheet style">
            <div role="radiogroup" aria-label="Sheet style" className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={sheetTheme.id === t.id}
                  onClick={() => setSheetTheme(t)}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left font-mono text-xs transition-colors ${
                    sheetTheme.id === t.id
                      ? "border-foreground bg-card"
                      : "border-border bg-card/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span aria-hidden="true" className="text-sm">
                    {t.glyphs[0] ?? "▦"}
                  </span>
                  {t.label}
                </button>
              ))}
            </div>
          </Panel>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.print()} disabled={!result} className="flex-1 gap-2">
              <Printer className="size-4" /> Print
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!result} className="bg-card gap-2">
                  <Eye className="size-4" /> Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto">
                <DialogTitle className="font-mono text-sm tracking-widest uppercase">
                  Print preview
                </DialogTitle>
                {result && (
                  <div
                    className="flex flex-col gap-6"
                    style={
                      {
                        "--foreground": "#22252a",
                        "--marker-ink": "#22252a",
                        "--marker": "#ffdf40",
                        "--border": "#d6d3cd",
                      } as React.CSSProperties
                    }
                  >
                    <SheetPages
                      result={result}
                      theme={sheetTheme}
                      pageClassName="rounded-md bg-white p-6 text-neutral-900 [box-shadow:var(--sheet-shadow)] sm:p-8"
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={exportPdf}
              disabled={!result || exporting}
              className="bg-card gap-2"
            >
              <Download className="size-4" />
              {exporting ? "Rendering…" : "PDF"}
            </Button>
            <Button variant="outline" onClick={puzzle.reshuffle} disabled={!result} className="gap-2 bg-card">
              <RefreshCw className="size-4" /> Shuffle
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex min-h-8 items-center justify-between">
            <h2 className="text-muted-foreground font-mono text-xs font-semibold tracking-[0.2em] uppercase">
              The sheet
            </h2>
            {result && (
              <div className="flex items-center gap-2">
                <Label htmlFor="answers" className="text-muted-foreground text-sm">
                  Show answers
                </Label>
                <Switch id="answers" checked={showAnswers} onCheckedChange={setShowAnswers} />
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 [box-shadow:var(--sheet-shadow)] sm:p-10">
            {result ? (
              <div className="flex flex-col items-center gap-6">
                {sheetTheme.glyphs.length > 0 && (
                  <div
                    aria-hidden="true"
                    className="flex w-full max-w-135 justify-between text-base leading-none select-none"
                  >
                    {banner(sheetTheme).map((g, i) => (
                      <span key={i}>{g}</span>
                    ))}
                  </div>
                )}
                <div className="flex w-full max-w-135 items-baseline justify-between font-mono text-xs tracking-widest uppercase">
                  <span className="font-bold">Word Search</span>
                  <label className="text-muted-foreground flex items-baseline gap-1">
                    №
                    <input
                      aria-label="Puzzle number"
                      inputMode="numeric"
                      value={state.seed}
                      onChange={(e) => {
                        const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                        puzzle.setSeed(Number.isNaN(n) ? 1 : n);
                      }}
                      className="focus:text-foreground focus:border-ring w-16 border-b border-dashed border-transparent bg-transparent font-mono text-xs tracking-widest outline-none hover:border-current"
                      title="The puzzle number is the seed — same words, same number, same puzzle"
                    />
                  </label>
                </div>
                <GridPreview result={result} showAnswers={showAnswers} />
                {result.unplaced.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>
                      Couldn't place {result.unplaced.length}{" "}
                      {result.unplaced.length === 1 ? "word" : "words"}
                    </AlertTitle>
                    <AlertDescription>
                      {result.unplaced.join(", ")} — try a larger grid, fewer words, or a shuffle.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="border-border w-full max-w-135 border-t border-dashed pt-4">
                  <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 font-mono text-sm">
                    {result.placements
                      .map((p) => p.word)
                      .sort()
                      .map((w) => (
                        <span key={w}>{w}</span>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 py-4">
                <div className="w-full max-w-70">
                  <GridPreview result={DEMO} showAnswers />
                </div>
                <p className="text-muted-foreground text-center">
                  Add a few words to see your puzzle take shape.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="text-muted-foreground mt-12 flex items-center justify-between font-mono text-xs">
        <span>Deterministic from a seed — same words, same №, same puzzle.</span>
        <a
          href="https://github.com/raymondshiner/wordsearch"
          className="hover:text-foreground underline underline-offset-4"
        >
          source
        </a>
      </footer>
    </div>
    {result && <PrintSheet result={result} theme={sheetTheme} />}
    </>
  );
}
