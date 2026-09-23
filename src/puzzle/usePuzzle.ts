import { useMemo, useState } from "react";
import { cleanWords, generate, overCapacity } from "@/engine";
import { deriveSettings, type DerivedSettings } from "./difficulty";

export interface PuzzleState {
  rawInput: string;
  dial: number;
  overrides: Partial<DerivedSettings>;
  seed: number;
}

export function usePuzzle() {
  const [state, setState] = useState<PuzzleState>({
    rawInput: "",
    dial: 3,
    overrides: {},
    seed: 1,
  });

  const settings = { ...deriveSettings(state.dial), ...state.overrides };
  const cleaned = useMemo(
    () => cleanWords(state.rawInput.split(/[\n,]+/), settings.size),
    [state.rawInput, settings.size],
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
    setRawInput: (rawInput: string) => setState((s) => ({ ...s, rawInput })),
    setDial: (dial: number) => setState((s) => ({ ...s, dial, overrides: {} })),
    setOverride: (patch: Partial<DerivedSettings>) =>
      setState((s) => ({ ...s, overrides: { ...s.overrides, ...patch } })),
    reshuffle: () => setState((s) => ({ ...s, seed: (s.seed * 48271 + 1) % 2147483647 })),
  };
}
