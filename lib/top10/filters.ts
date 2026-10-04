import { romanNumeral } from "@/lib/pokemon/labels-es";
import type { Pokemon } from "@/lib/pokemon/types";

/**
 * Sets of Pokémon a Top 10 can rank — [SET OF POKÉMON] + [METRIC].
 *
 * Types are deliberately NOT used as sets: the type is the per-position clue
 * instead. Catalogue sets (generations, legendaries, …) reuse the shared
 * category catalogue (lib/quartets/categories.ts) via prepareQuartetsData;
 * the few Top 10-only sets (all Pokémon, generation pairs) define `test`.
 *
 * Excluded after measuring: Paradox (≤2/10 notable Pokémon in its rankings),
 * "No evolucionan" (unnatural titles), Ultra Beasts (11 species).
 */
export interface Top10Filter {
  /** Catalogue category id, or a Top 10-only id ("all", "gens:1-2"). */
  id: string;
  /** Membership for Top 10-only sets; catalogue sets use the prepared members. */
  test?: (p: Pokemon) => boolean;
  /** Title for a metric phrase, e.g. "Los Pokémon más pesados de la Generación I". */
  title: (phrase: string) => string;
  /** Short label for sharing, e.g. "Generación I". */
  short: string;
  /** 0 easy … 1 harder set. */
  difficulty: number;
  weight: number;
}

const generations: Top10Filter[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) => ({
  id: `gen:${gen}`,
  title: (phrase) => `Los Pokémon ${phrase} de la Generación ${romanNumeral(gen)}`,
  short: `Generación ${romanNumeral(gen)}`,
  difficulty: gen <= 4 ? 0 : gen <= 6 ? 0.5 : 1,
  weight: 1,
}));

const generationPairs: Top10Filter[] = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
].map(([a, b]) => ({
  id: `gens:${a}-${b}`,
  test: (p: Pokemon) => p.generation === a || p.generation === b,
  title: (phrase: string) => `Los Pokémon ${phrase} de las Generaciones ${romanNumeral(a)} y ${romanNumeral(b)}`,
  short: `Generaciones ${romanNumeral(a)}–${romanNumeral(b)}`,
  difficulty: b <= 4 ? 0 : b <= 6 ? 0.5 : 1,
  weight: 0.8,
}));

export const TOP10_FILTERS: readonly Top10Filter[] = [
  { id: "all", test: () => true, title: (p) => `Los Pokémon ${p} de todos`, short: "Todos los Pokémon", difficulty: 0, weight: 1.5 },
  ...generations,
  ...generationPairs,
  { id: "flag:legendary", title: (p) => `Los Pokémon legendarios ${p}`, short: "Legendarios", difficulty: 0, weight: 1.2 },
  { id: "flag:starter", title: (p) => `Los Pokémon iniciales ${p}`, short: "Iniciales", difficulty: 0, weight: 1 },
  { id: "flag:mythical", title: (p) => `Los Pokémon singulares ${p}`, short: "Singulares", difficulty: 1, weight: 0.5 },
  { id: "flag:fossil", title: (p) => `Los Pokémon fósiles ${p}`, short: "Fósiles", difficulty: 1, weight: 0.4 },
];

const byId = new Map(TOP10_FILTERS.map((f) => [f.id, f]));
export const getTop10Filter = (id: string) => byId.get(id);
