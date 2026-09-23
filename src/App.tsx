import { useState } from "react";
import { Download, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { capacity } from "@/engine";
import { DIFFICULTY_LABELS } from "./puzzle/difficulty";
import { GridPreview } from "./puzzle/GridPreview";
import { usePuzzle } from "./puzzle/usePuzzle";

export default function App() {
  const puzzle = usePuzzle();
  const { state, settings, cleaned, tooDense, result } = puzzle;
  const [showAnswers, setShowAnswers] = useState(false);
  const [exporting, setExporting] = useState(false);

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
    <div className="mx-auto min-h-dvh max-w-6xl px-4 py-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Word Search Generator</h1>
        <p className="text-muted-foreground mt-1">
          Type your words, tune the difficulty, print the puzzle.
        </p>
      </header>

      <main className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Words</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Textarea
                aria-label="Word list"
                placeholder={"One word per line…\nPUZZLE\nSEARCH\nHIDDEN"}
                rows={8}
                value={state.rawInput}
                onChange={(e) => puzzle.setRawInput(e.target.value)}
              />
              <div className="text-muted-foreground flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">{cleaned.words.length} words</Badge>
                <Badge variant="secondary">
                  capacity ~{capacity(settings.size)} letters
                </Badge>
              </div>
              {cleaned.rejected.length > 0 && (
                <Alert>
                  <AlertTitle>Some entries were skipped</AlertTitle>
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
                <Alert variant="destructive">
                  <AlertTitle>That's a lot of letters</AlertTitle>
                  <AlertDescription>
                    This list is past the comfortable capacity for a {settings.size}×
                    {settings.size} grid. I'll still try — any words that don't fit are
                    listed below the preview.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Difficulty</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="difficulty">
                    {DIFFICULTY_LABELS[state.dial - 1]}
                  </Label>
                  <span className="text-muted-foreground text-sm">
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
              </div>

              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <SlidersHorizontal className="size-4" /> Advanced
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="flex flex-col gap-3 pt-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="size">Grid size: {settings.size}</Label>
                    <Slider
                      id="size"
                      aria-label="Grid size"
                      className="w-40"
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
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={exportPdf} disabled={!result || exporting} className="flex-1 gap-2">
              <Download className="size-4" />
              {exporting ? "Rendering…" : "Export PDF"}
            </Button>
            <Button variant="outline" onClick={puzzle.reshuffle} disabled={!result} className="gap-2">
              <RefreshCw className="size-4" /> Shuffle
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview</CardTitle>
            {result && (
              <div className="flex items-center gap-2">
                <Label htmlFor="answers" className="text-muted-foreground text-sm">
                  Show answers
                </Label>
                <Switch id="answers" checked={showAnswers} onCheckedChange={setShowAnswers} />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {result ? (
              <>
                <GridPreview result={result} showAnswers={showAnswers} />
                {result.unplaced.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>
                      Couldn't place {result.unplaced.length}{" "}
                      {result.unplaced.length === 1 ? "word" : "words"}
                    </AlertTitle>
                    <AlertDescription>
                      {result.unplaced.join(", ")} — try a larger grid, fewer words, or a
                      shuffle.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-sm">
                  {result.placements
                    .map((p) => p.word)
                    .sort()
                    .map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground py-16 text-center">
                Add a few words to see your puzzle.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
