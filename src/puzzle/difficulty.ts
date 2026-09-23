export interface DerivedSettings {
  size: number;
  allowBackwards: boolean;
  allowDiagonals: boolean;
}

export const DIFFICULTY_LABELS = ["Gentle", "Easy", "Classic", "Tricky", "Fiendish"] as const;

/** One honest dial. Advanced disclosure lets each derived value be overridden. */
export function deriveSettings(dial: number): DerivedSettings {
  switch (dial) {
    case 1:
      return { size: 10, allowBackwards: false, allowDiagonals: false };
    case 2:
      return { size: 12, allowBackwards: false, allowDiagonals: true };
    case 3:
      return { size: 15, allowBackwards: true, allowDiagonals: true };
    case 4:
      return { size: 18, allowBackwards: true, allowDiagonals: true };
    default:
      return { size: 22, allowBackwards: true, allowDiagonals: true };
  }
}
