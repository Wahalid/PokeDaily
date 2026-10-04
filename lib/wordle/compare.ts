import type { LetterState, WordleRow } from "./types";

/**
 * Wordle scoring with correct handling of repeated letters (two passes):
 * 1. exact matches are green and consume one occurrence of their letter;
 * 2. remaining letters are yellow while unconsumed occurrences remain, else grey.
 * Both words must have the same length.
 */
export function scoreGuess(guess: string, secret: string): LetterState[] {
  const pattern: LetterState[] = Array(guess.length).fill("absent");
  const remaining = new Map<string, number>();
  for (let i = 0; i < secret.length; i++) {
    if (guess[i] === secret[i]) pattern[i] = "correct";
    else remaining.set(secret[i], (remaining.get(secret[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (pattern[i] === "correct") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      pattern[i] = "present";
      remaining.set(guess[i], left - 1);
    }
  }
  return pattern;
}

const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

/** Keyboard colours: the best state seen for each letter (green > yellow > grey). */
export function keyboardStates(rows: readonly WordleRow[]): Record<string, LetterState> {
  const keys: Record<string, LetterState> = {};
  for (const row of rows) {
    row.pattern.forEach((state, i) => {
      const letter = row.word[i];
      if (!keys[letter] || RANK[state] > RANK[keys[letter]]) keys[letter] = state;
    });
  }
  return keys;
}
