import { hasDistinctSolution } from "@/lib/grid/engine";
import { getQuartetCategory, type CategoryFamily, type QuartetCategory } from "@/lib/quartets/categories";
import type { QuartetsData } from "@/lib/quartets/generator";
import { createRng, pickWeighted, type Rng } from "@/lib/random";
import { CELL_COUNT, DECK_SIZE, type BingoChallenge } from "./types";

/**
 * PokéBingo generator (server / scripts only).
 *
 * Reuses the Cuartetos category catalogue and data preparation
 * (prepareQuartetsData: base species only, members per category, familiarity)
 * and the Grid's bipartite matching (hasDistinctSolution).
 *
 * 1. draw 16 categories by difficulty quota (4 easy, 3 normal, 5 hard, 4 expert),
 *    with per-family caps, no near-equivalent pairs and few very broad cells;
 * 2. pick one "solution" Pokémon per cell (distinct, ≤1 per evolution line),
 *    then 8 extra cards — every card fits at least one cell;
 * 3. shuffle them into the opening deck (at play time a card is only dealt
 *    if it fits a cell that is still free; see lib/bingo/play.ts);
 * 4. validate: real matching, and every reachable board state must stay
 *    completable (`isAlwaysCompletable`); retry; relax; finally SAFE_BINGO.
 *
 * Bump BINGO_VERSION whenever output for a given seed would change.
 */
export const BINGO_VERSION = "2.0.0";

/**
 * Cells per difficulty. Measured: with 6 "hard" cells the per-family caps forced
 * "No evoluciona" + Singulares/Bebés/Fósiles almost every day (53/60 days), so
 * the hard tier has 5 cells (up to 4 dual types) and the expert tier 4.
 */
const QUOTAS: Record<number, number> = { 0: 4, 1: 3, 2: 5, 3: 4 };
const FAMILY_CAP: Record<CategoryFamily, number> = {
  type: 4,
  generation: 3,
  "dual-type": 4,
  classification: 3,
  ability: 3,
  measure: 2,
  evolution: 1,
  color: 0,
};
/** Cells matching more Pokémon than this are "very broad". */
const BROAD_MEMBERS = 120;
const MAX_BROAD_CELLS = 5;
/** Two cells this similar (Jaccard of their Pokémon sets) are near-equivalent. */
const MAX_JACCARD = 0.5;

export interface BingoRecency {
  /** Categories from the previous `strictDays` days are excluded… */
  strictDays: number;
  /** …and down-weighted (×softMultiplier) up to `softDays`. */
  softDays: number;
  softMultiplier: number;
  /** Pokémon dealt in the previous `pokemonDays` decks are not dealt again. */
  pokemonDays: number;
}

/**
 * Measured over 365 sequential days: excluding the previous 2 days keeps every
 * board on the normal path (0 fallbacks), no cell repeats from the day before,
 * and all 80 usable categories rotate (46–112 uses per year).
 */
export const DEFAULT_BINGO_RECENCY: BingoRecency = { strictDays: 2, softDays: 7, softMultiplier: 0.3, pokemonDays: 7 };

export interface BingoGeneratorOptions {
  seed: string;
  data: QuartetsData;
  /** Previous days, most recent first. */
  recentCategories?: ReadonlyArray<readonly string[]>;
  recentPokemon?: ReadonlyArray<readonly number[]>;
  recency?: BingoRecency;
  strictness?: "full" | "structural";
  maxAttempts?: number;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

export interface BingoAnalysis {
  problems: string[];
  /** Quality issues (only enforced on the normal path). */
  quality: string[];
  recognizable: number;
  /** Average number of cells each card fits. */
  avgOptions: number;
  /** Cards that fit no cell (never allowed: they could never be dealt). */
  deadCards: number;
}

const jaccardCache = new WeakMap<QuartetsData, Map<string, number>>();
function jaccard(data: QuartetsData, a: string, b: string): number {
  let cache = jaccardCache.get(data);
  if (!cache) jaccardCache.set(data, (cache = new Map()));
  const key = a < b ? `${a}|${b}` : `${b}|${a}`;
  let value = cache.get(key);
  if (value === undefined) {
    const A = data.members.get(a)!, B = data.members.get(b)!;
    let inter = 0;
    for (const id of A) if (B.has(id)) inter++;
    value = inter / (A.size + B.size - inter);
    cache.set(key, value);
  }
  return value;
}

/** For each cell, the deck cards (ids) that fit it. */
export function cellCandidates(challenge: BingoChallenge, data: QuartetsData, cards: readonly number[] = challenge.deck): number[][] {
  return challenge.cells.map((cell) => cards.filter((id) => data.members.get(cell)?.has(id)));
}

/**
 * True when NO sequence of correct placements can leave the board impossible
 * to complete. Dealt Pokémon are never already on the board, so a set F of
 * free cells is completable while |N(F) \ placed| ≥ |F| (Hall). The worst
 * case for F takes as many of N(F)'s Pokémon as possible onto the other cells
 * (a maximum matching M), so the board is safe iff |N(F)| − M(F) ≥ |F| for
 * every F. Only sets with |N(F)| < 16 can fail, which keeps the search tiny.
 */
export function isAlwaysCompletable(cells: readonly string[], data: QuartetsData): boolean {
  const sets = cells.map((id) => data.members.get(id) ?? new Set<number>());
  const n = cells.length;
  const small = sets.flatMap((s, i) => (s.size < n ? [i] : []));

  const maxMatching = (left: number[], right: ReadonlySet<number>) => {
    const owner = new Map<number, number>();
    const assign = (cell: number, seen: Set<number>): boolean => {
      for (const id of sets[cell]) {
        if (!right.has(id) || seen.has(id)) continue;
        seen.add(id);
        const other = owner.get(id);
        if (other === undefined || assign(other, seen)) {
          owner.set(id, cell);
          return true;
        }
      }
      return false;
    };
    return left.reduce((size, cell) => size + (assign(cell, new Set()) ? 1 : 0), 0);
  };

  const search = (start: number, chosen: number[], union: ReadonlySet<number>): boolean => {
    for (let k = start; k < small.length; k++) {
      const next = new Set(union);
      for (const id of sets[small[k]]) next.add(id);
      if (next.size >= n) continue;
      const free = [...chosen, small[k]];
      const others = cells.map((_, i) => i).filter((i) => !free.includes(i));
      if (next.size - maxMatching(others, next) < free.length) return false;
      if (!search(k + 1, free, next)) return false;
    }
    return true;
  };
  return search(0, [], new Set());
}

/** Full validation of a daily challenge. Pure. */
export function analyzeBingo(challenge: BingoChallenge, data: QuartetsData): BingoAnalysis {
  const problems: string[] = [];
  const quality: string[] = [];
  const { cells, deck } = challenge;

  if (cells.length !== CELL_COUNT) problems.push(`expected ${CELL_COUNT} cells`);
  if (new Set(cells).size !== cells.length) problems.push("duplicate cell");
  const categories = cells.map((id) => getQuartetCategory(id));
  if (categories.some((c) => !c || c.review || !data.usable.includes(c))) problems.push("unknown or non-usable category");
  if (deck.length !== DECK_SIZE) problems.push(`expected ${DECK_SIZE} cards`);
  if (new Set(deck).size !== deck.length) problems.push("duplicate card");
  if (deck.some((id) => !data.byId.has(id))) problems.push("card outside the base-species pool");
  if (problems.length) return { problems, quality, recognizable: 0, avgOptions: 0, deadCards: 0 };

  // Solvability: real matching cells ↔ distinct cards of the opening deck, and
  // no reachable board state can become impossible to complete.
  if (!hasDistinctSolution(cellCandidates(challenge, data))) problems.push("board cannot be completed with this deck");
  if (!isAlwaysCompletable(cells, data)) problems.push("a reachable board state cannot be completed");

  const familyCount = new Map<string, number>();
  for (const c of categories as QuartetCategory[]) familyCount.set(c.family, (familyCount.get(c.family) ?? 0) + 1);
  for (const [family, n] of familyCount) if (n > FAMILY_CAP[family as CategoryFamily]) problems.push(`too many ${family} cells`);
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (jaccard(data, cells[i], cells[j]) > MAX_JACCARD) problems.push(`near-equivalent cells ${cells[i]} / ${cells[j]}`);
    }
  }

  const options = deck.map((id) => cells.filter((cell) => data.members.get(cell)!.has(id)).length);
  const deadCards = options.filter((n) => n === 0).length;
  if (deadCards > 0) problems.push("card fits no cell");
  const avgOptions = options.reduce((a, b) => a + b, 0) / deck.length;
  const recognizable = deck.filter((id) => data.familiar.has(id)).length;
  const broad = cells.filter((id) => data.members.get(id)!.size > BROAD_MEMBERS).length;

  if (recognizable < 16) quality.push("too-few-recognizable");
  if (avgOptions < 1.3) quality.push("too-few-choices");
  if (avgOptions > 4) quality.push("too-easy");
  if (broad > MAX_BROAD_CELLS) quality.push("too-many-broad-cells");
  const difficulty = (categories as QuartetCategory[]).map((c) => c.difficulty);
  for (const [tier, quota] of Object.entries(QUOTAS)) {
    if (difficulty.filter((d) => d === Number(tier)).length !== quota) quality.push("difficulty-mix");
  }
  return { problems, quality: [...new Set(quality)], recognizable, avgOptions, deadCards };
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface BingoGenerationResult {
  challenge: BingoChallenge;
  analysis: BingoAnalysis;
  attempts: number;
  rejections: Record<string, number>;
}

export class BingoGenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly rejections: Record<string, number>,
  ) {
    super(message);
  }
}

export function generateBingo(options: BingoGeneratorOptions): BingoGenerationResult {
  const { seed, data, recentCategories = [], recentPokemon = [], recency = DEFAULT_BINGO_RECENCY } = options;
  const strictness = options.strictness ?? "full";
  const maxAttempts = options.maxAttempts ?? 600;
  const rng = createRng(seed);
  const weights = categoryWeights(data, recentCategories, recency);
  const blocked = new Set(recentPokemon.slice(0, recency.pokemonDays).flat());
  const rejections: Record<string, number> = {};
  const reject = (reason: string) => (rejections[reason] = (rejections[reason] ?? 0) + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const cells = drawCells(rng, data, weights);
    if (!cells) {
      reject("no-category-combination");
      continue;
    }
    const deck = drawDeck(rng, data, cells, blocked);
    if (!deck) {
      reject("not-enough-cards");
      continue;
    }
    const challenge: BingoChallenge = { cells: cells.map((c) => c.id), deck };
    const analysis = analyzeBingo(challenge, data);
    if (analysis.problems.length) {
      reject(analysis.problems[0].replace(/ [a-z]+:.*$/, "").trim());
      continue;
    }
    if (strictness === "full" && analysis.quality.length) {
      reject(analysis.quality[0]);
      continue;
    }
    return { challenge, analysis, attempts: attempt, rejections };
  }
  throw new BingoGenerationError(`No valid PokéBingo for seed "${seed}"`, maxAttempts, rejections);
}

/**
 * Pre-validated last resort (checked by `npm run verify`): produced once by the
 * generator, then pinned here so it never depends on randomness or recency.
 */
export const SAFE_BINGO: BingoChallenge = {
  cells: [
    "ability:chlorophyll", "dual:ghost+grass", "type:fire", "dual:flying+psychic",
    "type:water", "gen:4", "measure:light", "gen:5",
    "ability:static", "gen:9", "type:fighting", "ability:keen-eye",
    "dual:fire+ghost", "flag:baby", "type:ghost", "dual:psychic+water",
  ],
  deck: [527, 447, 164, 298, 482, 125, 78, 709, 468, 977, 779, 855, 551, 44, 400, 270, 322, 18, 607, 194, 139, 475, 71, 479],
};

export interface SafeBingoResult extends BingoGenerationResult {
  /** 0 = normal path, 1 = structural rules only, 2 = no recency, 3 = SAFE_BINGO. */
  fallbackStep: number;
}

/** Like generateBingo, but never throws. */
export function generateBingoSafe(options: BingoGeneratorOptions): SafeBingoResult {
  const ladder: Array<Partial<BingoGeneratorOptions>> = [
    {},
    { strictness: "structural", seed: `${options.seed}:structural` },
    { strictness: "structural", recentCategories: [], recentPokemon: [], seed: `${options.seed}:no-recency` },
  ];
  const rejections: Record<string, number> = {};
  let attempts = 0;
  for (let step = 0; step < ladder.length; step++) {
    try {
      const result = generateBingo({ ...options, ...ladder[step] });
      return { ...result, attempts: attempts + result.attempts, fallbackStep: step };
    } catch (error) {
      if (error instanceof BingoGenerationError) {
        attempts += error.attempts;
        for (const [k, v] of Object.entries(error.rejections)) rejections[k] = (rejections[k] ?? 0) + v;
      }
    }
  }
  return { challenge: SAFE_BINGO, analysis: analyzeBingo(SAFE_BINGO, options.data), attempts, rejections, fallbackStep: ladder.length };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function categoryWeights(
  data: QuartetsData,
  recentCategories: ReadonlyArray<readonly string[]>,
  recency: BingoRecency,
): Map<string, number> {
  const daysSince = new Map<string, number>();
  recentCategories.forEach((ids, i) => ids.forEach((id) => daysSince.has(id) || daysSince.set(id, i + 1)));
  return new Map(
    data.usable.map((c) => {
      const d = daysSince.get(c.id);
      const factor = d === undefined || d > recency.softDays ? 1 : d <= recency.strictDays ? 0 : recency.softMultiplier;
      return [c.id, factor];
    }),
  );
}

function drawCells(rng: Rng, data: QuartetsData, weights: ReadonlyMap<string, number>): QuartetCategory[] | null {
  const chosen: QuartetCategory[] = [];
  const slots = Object.entries(QUOTAS).flatMap(([tier, n]) => Array<number>(n).fill(Number(tier)));
  for (const tier of slots) {
    const candidates = data.usable.filter(
      (c) =>
        c.difficulty === tier &&
        (weights.get(c.id) ?? 0) > 0 &&
        !chosen.includes(c) &&
        chosen.filter((x) => x.family === c.family).length < FAMILY_CAP[c.family] &&
        chosen.every((x) => jaccard(data, x.id, c.id) <= MAX_JACCARD),
    );
    if (candidates.length === 0) return null;
    chosen.push(pickWeighted(rng, candidates, (c) => weights.get(c.id)!));
  }
  // Shuffle positions so difficulty isn't laid out in rows.
  return shuffle(rng, chosen);
}

function drawDeck(rng: Rng, data: QuartetsData, cells: QuartetCategory[], blocked: ReadonlySet<number>): number[] | null {
  const used = new Set<number>();
  const usedChains = new Set<number>();
  const available = (id: number) => {
    const evo = data.byId.get(id)!.evolution;
    return !used.has(id) && !blocked.has(id) && !(evo.hasEvolutionFamily && usedChains.has(evo.chainId));
  };
  const take = (id: number) => {
    used.add(id);
    const evo = data.byId.get(id)!.evolution;
    if (evo.hasEvolutionFamily) usedChains.add(evo.chainId);
  };

  // One solution card per cell, most constrained cells first.
  const order = cells.map((_, i) => i).sort((a, b) => data.members.get(cells[a].id)!.size - data.members.get(cells[b].id)!.size);
  const solution: number[] = [];
  for (const i of order) {
    const candidates = [...data.members.get(cells[i].id)!].filter(available);
    if (candidates.length === 0) return null;
    const id = pickWeighted(rng, candidates, (x) => (data.familiar.has(x) ? 4 : 1));
    take(id);
    solution.push(id);
  }

  // 8 extra cards, every one fitting at least one cell (a card that fits nowhere could never be dealt).
  const fits = (id: number) => cells.some((c) => data.members.get(c.id)!.has(id));
  const extras: number[] = [];
  const pool = data.pool.map((p) => p.id).filter((id) => available(id) && fits(id));
  while (extras.length < DECK_SIZE - CELL_COUNT) {
    const candidates = pool.filter(available);
    if (candidates.length === 0) return null;
    const id = pickWeighted(rng, candidates, (x) => (data.familiar.has(x) ? 3 : 1));
    take(id);
    extras.push(id);
  }
  return shuffle(rng, [...solution, ...extras]);
}

/**
 * Replaces the cards of an existing deck that fit no cell with fitting ones, in
 * place (same positions, everything else untouched). Used to repair frozen
 * boards produced by the previous generator, which allowed up to 2 such cards.
 */
export function repairDeadCards(challenge: BingoChallenge, data: QuartetsData, seed: string): BingoChallenge {
  const rng = createRng(seed);
  const fits = (id: number) => challenge.cells.some((c) => data.members.get(c)!.has(id));
  const chain = (id: number) => {
    const evo = data.byId.get(id)?.evolution;
    return evo?.hasEvolutionFamily ? evo.chainId : null;
  };
  const deck = challenge.deck.slice();
  for (let i = 0; i < deck.length; i++) {
    if (fits(deck[i])) continue;
    const kept = deck.filter((_, j) => j !== i);
    const chains = new Set(kept.map(chain));
    const candidates = data.pool
      .map((p) => p.id)
      .filter((id) => fits(id) && !kept.includes(id) && (chain(id) === null || !chains.has(chain(id))));
    deck[i] = pickWeighted(rng, candidates, (x) => (data.familiar.has(x) ? 3 : 1));
  }
  return { cells: challenge.cells.slice(), deck };
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
