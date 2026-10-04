import { isFamiliar } from "@/lib/quartets/generator";
import { createRng, pickWeighted } from "@/lib/random";
import type { WordleChallenge, WordleEntry } from "./types";
import type { WordleDictionary } from "./words";

/**
 * Daily secret selection for PokéWordle. Bump WORDLE_VERSION if it changes.
 *
 * Length distribution (normalized names, eligible secrets):
 *   3: 2 · 4: 12 · 5: 50 · 6: 165 · 7: 265 · 8: 242 · 9: 181 · 10: 79 · 11: 23 · 12: 4
 * The day's length is drawn first with LENGTH_WEIGHTS (≈ %): it follows the
 * real data in the middle (6–9 letters, the classic Wordle feel) and damps the
 * extremes, so 3- and 12-letter days are rare treats instead of ~0% / never,
 * and 4/5/10/11 appear regularly enough to give variety.
 * Then a Pokémon of that length is drawn, favouring recognizable names
 * (familiar ×4, starters/legendaries/mythicals/final evolutions ×2, others ×1)
 * without excluding anyone.
 */
export const WORDLE_VERSION = "1.0.0";

export const LENGTH_WEIGHTS: Record<number, number> = {
  3: 0.5,
  4: 3,
  5: 9,
  6: 17,
  7: 22,
  8: 20,
  9: 15,
  10: 9,
  11: 3.5,
  12: 1,
};

/** A Pokémon is never the secret twice within this many days. */
export const REPEAT_DAYS = 365;
/** Lengths ≤ 4 or ≥ 11 are "extreme": never on two consecutive days. */
export const isExtremeLength = (n: number) => n <= 4 || n >= 11;

export function recognizability(entry: WordleEntry, dict: WordleDictionary): number {
  const p = dict.byId.get(entry.ids[0]);
  if (!p) return 1;
  if (isFamiliar(p)) return 4;
  const finalEvolution = p.evolution.hasEvolutionFamily && p.evolution.evolvesTo.length === 0;
  return p.flags.isStarter || p.flags.isLegendary || p.flags.isMythical || finalEvolution ? 2 : 1;
}

export interface WordleGeneration {
  challenge: WordleChallenge;
  /** 0 = all rules · 1 = length variety rules relaxed · 2 = repeat window relaxed. */
  fallbackStep: number;
}

/**
 * `recent[0]` is yesterday, `recent[1]` the day before, … (null = unknown day).
 * Deterministic for a given seed and history.
 */
export function generateWordle(input: {
  seed: string;
  dict: WordleDictionary;
  recent: ReadonlyArray<WordleChallenge | null>;
}): WordleGeneration {
  const rng = createRng(input.seed);
  const used = new Set(input.recent.slice(0, REPEAT_DAYS).flatMap((c) => (c ? [c.word] : [])));
  const lengths = input.recent.slice(0, 2).map((c) => c?.word.length ?? 0);

  const lengthAllowed = (n: number) =>
    !(lengths[0] === n && lengths[1] === n) && !(isExtremeLength(n) && lengths[0] > 0 && isExtremeLength(lengths[0]));

  const steps: Array<{ checkLength: boolean; checkRepeat: boolean }> = [
    { checkLength: true, checkRepeat: true },
    { checkLength: false, checkRepeat: true },
    { checkLength: false, checkRepeat: false },
  ];
  for (let step = 0; step < steps.length; step++) {
    const { checkLength, checkRepeat } = steps[step];
    const candidates = input.dict.secrets.filter((e) => !checkRepeat || !used.has(e.word));
    const byLength = new Map<number, WordleEntry[]>();
    for (const e of candidates) byLength.set(e.word.length, [...(byLength.get(e.word.length) ?? []), e]);
    const options = [...byLength.keys()]
      .filter((n) => (LENGTH_WEIGHTS[n] ?? 0) > 0 && (!checkLength || lengthAllowed(n)))
      .sort((a, b) => a - b);
    if (options.length === 0) continue;
    const length = pickWeighted(rng, options, (n) => LENGTH_WEIGHTS[n]);
    const entry = pickWeighted(rng, byLength.get(length)!, (e) => recognizability(e, input.dict));
    return { challenge: { word: entry.word }, fallbackStep: step };
  }
  // Unreachable with a non-empty dictionary.
  return { challenge: { word: input.dict.secrets[0].word }, fallbackStep: 3 };
}
