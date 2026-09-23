import { useMemo, useState } from "react";
import { cleanWords, generate, MIN_WORD_LENGTH, overCapacity } from "@/engine";
import { deriveSettings, type DerivedSettings } from "./difficulty";

export interface PuzzleState {
  words: string[];
  dial: number;
  overrides: Partial<DerivedSettings>;
  seed: number;
}

/** Normalize one raw entry the way the engine will see it. */
export function normalizeWord(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z]/g, "");
}

export function usePuzzle() {
  const [state, setState] = useState<PuzzleState>({
    words: [],
    dial: 3,
    overrides: {},
    seed: 1,
  });

  const settings = { ...deriveSettings(state.dial), ...state.overrides };
  const cleaned = useMemo(
    () => cleanWords(state.words, settings.size),
    [state.words, settings.size],
  );
  const tooDense = overCapacity(cleaned.words, settings.size);

  const result = useMemo(
    () =>
      cleaned.words.length > 0
        ? generate(cleaned.words, { ...settings, seed: state.seed })
        : null,
    [cleaned.words, settings.size, settings.allowBackwards, settings.allowDiagonals, state.seed],
  );

  return {
    state,
    settings,
    cleaned,
    tooDense,
    result,
    /** Returns an error message, or null when the word was added. */
    addWord: (raw: string): string | null => {
      const word = normalizeWord(raw);
      if (word.length === 0) return "Letters only — type a word first.";
      if (word.length < MIN_WORD_LENGTH) return `Words need at least ${MIN_WORD_LENGTH} letters.`;
      if (state.words.includes(word)) return `${word} is already in the list.`;
      setState((s) => (s.words.includes(word) ? s : { ...s, words: [...s.words, word] }));
      return null;
    },
    removeWord: (word: string) =>
      setState((s) => ({ ...s, words: s.words.filter((w) => w !== word) })),
    clearWords: () => setState((s) => ({ ...s, words: [] })),
    setDial: (dial: number) => setState((s) => ({ ...s, dial, overrides: {} })),
    setOverride: (patch: Partial<DerivedSettings>) =>
      setState((s) => ({ ...s, overrides: { ...s.overrides, ...patch } })),
    setSeed: (seed: number) => setState((s) => ({ ...s, seed })),
    reshuffle: () => setState((s) => ({ ...s, seed: (s.seed * 48271 + 1) % 2147483647 })),
  };
}
