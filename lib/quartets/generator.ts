import { isBaseSpecies } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { createRng, pickWeighted, type Rng } from "@/lib/random";
import { QUARTET_CATEGORIES, getQuartetCategory, type CategoryFamily, type QuartetCategory } from "./categories";
import { GROUP_COUNT, GROUP_SIZE, type DayLevel, type QuartetBoard, type QuartetGroup, type Tier } from "./types";

/**
 * Cuartetos board generator (server / scripts only).
 *
 * 1. pick 4 categories — one per difficulty slot for the day level, ≤2 per
 *    family, damped by recency;
 * 2. pick 4 Pokémon per category that belong ONLY to their own group within
 *    the board (so the solution is unique), ≤1 per evolution line, favouring
 *    familiar Pokémon on easier days;
 * 3. validate: no alternative catalogue group of exactly 4, enough
 *    recognisable Pokémon, red herrings and difficulty score fitting the day,
 *    no group repeated within the recency window;
 * 4. retry; relax step by step; finally use a pre-validated SAFE_BOARD.
 *
 * Bump QUARTETS_VERSION whenever output for a given seed would change.
 */
export const QUARTETS_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Precomputed data
// ---------------------------------------------------------------------------

export interface QuartetsData {
  pool: readonly Pokemon[];
  byId: ReadonlyMap<number, Pokemon>;
  /** Every catalogue category (used for validation, incl. review ones). */
  all: readonly QuartetCategory[];
  /** Categories the generator may choose from. */
  usable: readonly QuartetCategory[];
  members: ReadonlyMap<string, ReadonlySet<number>>;
  familiar: ReadonlySet<number>;
}

/** Recognisability proxy: early generations, starters and classic legendaries. */
export function isFamiliar(p: Pokemon): boolean {
  return p.generation <= 4 || p.flags.isStarter || (p.flags.isLegendary && p.generation <= 7);
}

const MIN_CATEGORY_MEMBERS = 6;

export function prepareQuartetsData(
  pokemon: readonly Pokemon[],
  options: { allowReviewCategories?: boolean } = {},
): QuartetsData {
  const pool = pokemon.filter(isBaseSpecies);
  const members = new Map(QUARTET_CATEGORIES.map((c) => [c.id, new Set(pool.filter(c.test).map((p) => p.id))]));
  return {
    pool,
    byId: new Map(pool.map((p) => [p.id, p])),
    all: QUARTET_CATEGORIES,
    usable: QUARTET_CATEGORIES.filter(
      (c) => (options.allowReviewCategories || !c.review) && members.get(c.id)!.size >= MIN_CATEGORY_MEMBERS,
    ),
    members,
    familiar: new Set(pool.filter(isFamiliar).map((p) => p.id)),
  };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Allowed category difficulties for the 4 slots (slot i ≈ intended tier i). */
const LEVEL_SLOTS: Record<DayLevel, ReadonlyArray<ReadonlyArray<number>>> = {
  easy: [[0], [0, 1], [1, 2], [2]],
  medium: [[0, 1], [1], [2], [2, 3]],
  hard: [[1], [1, 2], [2, 3], [3]],
};

export interface LevelRules {
  minRecognizable: number;
  minHerrings: number;
  scoreRange: [number, number];
  /** Selection weight of familiar vs. other Pokémon. */
  familiarWeight: number;
}

export const LEVEL_RULES: Record<DayLevel, LevelRules> = {
  easy: { minRecognizable: 12, minHerrings: 0, scoreRange: [0, 1.6], familiarWeight: 8 },
  medium: { minRecognizable: 10, minHerrings: 1, scoreRange: [1.2, 2.3], familiarWeight: 4 },
  hard: { minRecognizable: 10, minHerrings: 1, scoreRange: [1.9, 3.4], familiarWeight: 2 },
};

const FAMILY_WEIGHT: Record<CategoryFamily, number> = {
  type: 3,
  "dual-type": 2,
  generation: 2,
  classification: 2,
  evolution: 1,
  ability: 1.5,
  measure: 1,
  color: 1,
};
const MAX_PER_FAMILY = 2;

export interface RecencyConfig {
  /** Categories used within this many days are excluded. */
  strictDays: number;
  /** …and down-weighted (×softMultiplier) up to this many days. */
  softDays: number;
  softMultiplier: number;
  /** An identical group (same 4 Pokémon) may not reappear within this many days. */
  groupDays: number;
}

/**
 * Measured on the real data over 365 sequential days:
 * - "no category within 30 days" is infeasible: 30 days × 4 = 120 slots for
 *   81 usable categories, and only 10 have difficulty 1 (needed every medium day);
 * - strict exclusion of 5 days keeps every board on the normal path (2/365 used
 *   the structural fallback, which still applies recency); 10 days pushed 70/365
 *   boards to the soft-recency fallback;
 * - days 6–30 are down-weighted ×0.05, so categories still rotate.
 */
export const DEFAULT_RECENCY: RecencyConfig = { strictDays: 5, softDays: 30, softMultiplier: 0.05, groupDays: 365 };

export interface GeneratorOptions {
  seed: string;
  data: QuartetsData;
  level: DayLevel;
  /** Category ids of previous days, most recent first (index 0 = yesterday). */
  recentCategories?: ReadonlyArray<readonly string[]>;
  /** Group keys (see groupKey) used within `recency.groupDays`. */
  recentGroups?: ReadonlySet<string>;
  recency?: RecencyConfig;
  /** "full" = all rules; "structural" = drop day-quality rules (herrings, score band). */
  strictness?: "full" | "structural";
  maxAttempts?: number;
}

// ---------------------------------------------------------------------------
// Analysis & validation
// ---------------------------------------------------------------------------

export const groupKey = (ids: readonly number[]) => [...ids].sort((a, b) => a - b).join(",");

export interface BoardAnalysis {
  /** Structural problems — any of these makes the board unplayable/ambiguous. */
  problems: string[];
  recognizable: number;
  /** Off-board catalogue categories matching ≥5 board Pokémon across ≥2 groups. */
  herrings: number;
  groupScores: number[];
  score: number;
}

/** Full validation of a board against the catalogue. Pure. */
export function analyzeBoard(board: QuartetBoard, data: QuartetsData): BoardAnalysis {
  const problems: string[] = [];
  const ids = board.groups.flatMap((g) => g.pokemonIds);
  if (board.groups.length !== GROUP_COUNT) problems.push(`expected ${GROUP_COUNT} groups`);
  if (board.groups.some((g) => g.pokemonIds.length !== GROUP_SIZE)) problems.push(`every group needs ${GROUP_SIZE} Pokémon`);
  if (new Set(ids).size !== GROUP_COUNT * GROUP_SIZE) problems.push("Pokémon must be 16 distinct");
  if (ids.some((id) => !data.byId.has(id))) problems.push("Pokémon outside the base-species pool");
  if (groupKey(board.layout) !== groupKey(ids)) problems.push("layout must be a permutation of the 16 Pokémon");
  if (new Set(board.groups.map((g) => g.tier)).size !== GROUP_COUNT) problems.push("tiers must be 0–3, one each");

  const categories = board.groups.map((g) => getQuartetCategory(g.categoryId));
  if (categories.some((c) => !c)) {
    problems.push("unknown category");
    return { problems, recognizable: 0, herrings: 0, groupScores: [], score: 0 };
  }
  const boardCategories = categories as QuartetCategory[];
  const member = (catId: string, id: number) => data.members.get(catId)?.has(id) ?? false;

  // Uniqueness: every Pokémon satisfies its own category and none of the other three.
  board.groups.forEach((group, gi) => {
    for (const id of group.pokemonIds) {
      if (!member(group.categoryId, id)) problems.push(`#${id} does not belong to ${group.categoryId}`);
      boardCategories.forEach((c, ci) => {
        if (ci !== gi && member(c.id, id)) problems.push(`#${id} also fits ${c.id} (ambiguous)`);
      });
    }
  });

  // Alternative groups: an off-board category matching exactly 4 board Pokémon
  // that are not exactly one group would be a second, equally valid answer.
  const groupOf = new Map(board.groups.flatMap((g, gi) => g.pokemonIds.map((id) => [id, gi] as const)));
  const onBoard = new Set(board.groups.map((g) => g.categoryId));
  let herrings = 0;
  const herringTouches = [0, 0, 0, 0];
  for (const c of data.all) {
    if (onBoard.has(c.id)) continue;
    const hits = ids.filter((id) => member(c.id, id));
    const groupsHit = new Set(hits.map((id) => groupOf.get(id)));
    if (hits.length === GROUP_SIZE && groupsHit.size > 1) problems.push(`alternative group: ${c.id}`);
    if (hits.length > GROUP_SIZE && groupsHit.size > 1 && c.difficulty <= 2 && !c.review) {
      herrings++;
      groupsHit.forEach((gi) => herringTouches[gi!]++);
    }
  }

  // Evolution lines: at most one member per line on the whole board.
  const chains = ids.map((id) => data.byId.get(id)?.evolution).filter((e) => e && e.hasEvolutionFamily).map((e) => e!.chainId);
  if (new Set(chains).size !== chains.length) problems.push("two Pokémon from the same evolution line");

  const recognizable = ids.filter((id) => data.familiar.has(id)).length;
  const groupScores = board.groups.map((g, gi) => {
    const unfamiliar = g.pokemonIds.filter((id) => !data.familiar.has(id)).length;
    return boardCategories[gi].difficulty + 0.6 * (unfamiliar / GROUP_SIZE) + 0.15 * herringTouches[gi];
  });
  const score = groupScores.reduce((a, b) => a + b, 0) / Math.max(1, groupScores.length);
  return { problems, recognizable, herrings, groupScores, score };
}

/** Day-quality checks on top of the structural ones. Returns the first failing rule or null. */
export function dayQualityProblem(analysis: BoardAnalysis, level: DayLevel): string | null {
  const rules = LEVEL_RULES[level];
  if (analysis.recognizable < rules.minRecognizable) return "too-few-recognizable";
  if (analysis.herrings < rules.minHerrings) return "too-trivial";
  if (analysis.score < rules.scoreRange[0] || analysis.score > rules.scoreRange[1]) return "wrong-difficulty-for-day";
  return null;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

export interface GenerationResult {
  board: QuartetBoard;
  analysis: BoardAnalysis;
  attempts: number;
  rejections: Record<string, number>;
}

export class QuartetsGenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly rejections: Record<string, number>,
  ) {
    super(message);
  }
}

export function generateQuartets(options: GeneratorOptions): GenerationResult {
  const { seed, data, level, recentCategories = [], recentGroups = new Set(), recency = DEFAULT_RECENCY } = options;
  const strictness = options.strictness ?? "full";
  const maxAttempts = options.maxAttempts ?? 3000;
  const rng = createRng(seed);
  const weights = categoryWeights(data, recentCategories, recency);
  const rejections: Record<string, number> = {};
  const reject = (reason: string) => (rejections[reason] = (rejections[reason] ?? 0) + 1);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const categories = drawCategories(rng, data, level, weights);
    if (!categories) {
      reject("no-category-combination");
      continue;
    }
    const groups = drawPokemon(rng, data, level, categories);
    if (!groups) {
      reject("not-enough-exclusive-candidates");
      continue;
    }
    if (groups.some((g) => recentGroups.has(groupKey(g.pokemonIds)))) {
      reject("group-repeated-within-a-year");
      continue;
    }

    const draft: QuartetBoard = { groups, layout: shuffle(rng, groups.flatMap((g) => g.pokemonIds)) };
    const analysis = analyzeBoard(draft, data);
    if (analysis.problems.length > 0) {
      reject(analysis.problems[0].replace(/[#:].*$/, "").trim() || "structural");
      continue;
    }
    if (strictness === "full") {
      const problem = dayQualityProblem(analysis, level);
      if (problem) {
        reject(problem);
        continue;
      }
    }

    // Visual tier = relative difficulty within the board (🟨 easiest … 🟪 hardest).
    const order = analysis.groupScores.map((s, i) => [s, i] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const tiered = draft.groups.map((g) => ({ ...g }));
    order.forEach(([, gi], rank) => (tiered[gi].tier = rank as Tier));
    const board: QuartetBoard = { groups: tiered, layout: draft.layout };
    return { board, analysis: analyzeBoard(board, data), attempts: attempt, rejections };
  }
  throw new QuartetsGenerationError(`No valid Cuartetos board for seed "${seed}"`, maxAttempts, rejections);
}

/**
 * Hand-picked, pre-validated last resort (verified by `npm run verify`):
 * Fire / Water / Electric types and Legendaries, all familiar Pokémon.
 */
export const SAFE_BOARD: QuartetBoard = {
  groups: [
    { categoryId: "type:fire", pokemonIds: [37, 58, 77, 126], tier: 0 }, // Vulpix, Growlithe, Ponyta, Magmar
    { categoryId: "type:water", pokemonIds: [54, 60, 72, 86], tier: 1 }, // Psyduck, Poliwag, Tentacool, Seel
    { categoryId: "type:electric", pokemonIds: [25, 100, 81, 179], tier: 2 }, // Pikachu, Voltorb, Magnemite, Mareep
    { categoryId: "flag:legendary", pokemonIds: [150, 144, 249, 377], tier: 3 }, // Mewtwo, Articuno, Lugia, Regirock
  ],
  layout: [37, 54, 25, 150, 60, 58, 100, 144, 81, 72, 77, 249, 86, 179, 377, 126],
};

export interface SafeGenerationResult extends GenerationResult {
  /** 0 = normal path, 1 = structural rules only, 2 = soft recency only, 3 = SAFE_BOARD. */
  fallbackStep: number;
}

/** Like generateQuartets, but never throws. */
export function generateQuartetsSafe(options: GeneratorOptions): SafeGenerationResult {
  const recency = options.recency ?? DEFAULT_RECENCY;
  const ladder: Array<Partial<GeneratorOptions>> = [
    {},
    // Keep recency, drop the day-quality rules.
    { strictness: "structural", seed: `${options.seed}:structural` },
    // Soft recency only (no strict exclusion), still structurally valid.
    { strictness: "structural", recency: { ...recency, strictDays: 0 }, seed: `${options.seed}:soft-recency` },
  ];
  const rejections: Record<string, number> = {};
  let attempts = 0;
  for (let step = 0; step < ladder.length; step++) {
    try {
      const result = generateQuartets({ ...options, ...ladder[step] });
      return { ...result, attempts: attempts + result.attempts, fallbackStep: step };
    } catch (error) {
      if (error instanceof QuartetsGenerationError) {
        attempts += error.attempts;
        for (const [k, v] of Object.entries(error.rejections)) rejections[k] = (rejections[k] ?? 0) + v;
      }
    }
  }
  return { board: SAFE_BOARD, analysis: analyzeBoard(SAFE_BOARD, options.data), attempts, rejections, fallbackStep: ladder.length };
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function categoryWeights(
  data: QuartetsData,
  recentCategories: ReadonlyArray<readonly string[]>,
  recency: RecencyConfig,
): Map<string, number> {
  const daysSince = new Map<string, number>();
  recentCategories.forEach((ids, i) => ids.forEach((id) => daysSince.has(id) || daysSince.set(id, i + 1)));
  const familySize = new Map<CategoryFamily, number>();
  data.usable.forEach((c) => familySize.set(c.family, (familySize.get(c.family) ?? 0) + 1));
  return new Map(
    data.usable.map((c) => {
      const d = daysSince.get(c.id);
      const factor = d === undefined || d > recency.softDays ? 1 : d <= recency.strictDays ? 0 : recency.softMultiplier;
      return [c.id, (FAMILY_WEIGHT[c.family] / familySize.get(c.family)!) * factor];
    }),
  );
}

/** Members of `a` that are not members of `b` (memoised per data set). */
const exclusiveCache = new WeakMap<QuartetsData, Map<string, number>>();
function exclusiveCount(data: QuartetsData, a: string, b: string): number {
  let cache = exclusiveCache.get(data);
  if (!cache) exclusiveCache.set(data, (cache = new Map()));
  const key = `${a}|${b}`;
  let n = cache.get(key);
  if (n === undefined) {
    const bSet = data.members.get(b)!;
    n = 0;
    for (const id of data.members.get(a)!) if (!bSet.has(id)) n++;
    cache.set(key, n);
  }
  return n;
}

/** Each category of a pair must keep enough Pokémon that don't fit the other. */
const MIN_PAIRWISE_EXCLUSIVE = 6;
const compatible = (data: QuartetsData, a: QuartetCategory, b: QuartetCategory) =>
  exclusiveCount(data, a.id, b.id) >= MIN_PAIRWISE_EXCLUSIVE && exclusiveCount(data, b.id, a.id) >= MIN_PAIRWISE_EXCLUSIVE;

function drawCategories(
  rng: Rng,
  data: QuartetsData,
  level: DayLevel,
  weights: ReadonlyMap<string, number>,
): QuartetCategory[] | null {
  const chosen: QuartetCategory[] = [];
  for (const allowed of LEVEL_SLOTS[level]) {
    const candidates = data.usable.filter(
      (c) =>
        allowed.includes(c.difficulty) &&
        (weights.get(c.id) ?? 0) > 0 &&
        !chosen.includes(c) &&
        chosen.filter((x) => x.family === c.family).length < MAX_PER_FAMILY &&
        chosen.every((x) => compatible(data, c, x)),
    );
    if (candidates.length === 0) return null;
    chosen.push(pickWeighted(rng, candidates, (c) => weights.get(c.id)!));
  }
  return chosen;
}

function drawPokemon(rng: Rng, data: QuartetsData, level: DayLevel, categories: QuartetCategory[]): QuartetGroup[] | null {
  const usedChains = new Set<number>();
  const groups: QuartetGroup[] = [];
  const familiarWeight = LEVEL_RULES[level].familiarWeight;

  // Fill the most constrained category first.
  const exclusive = categories.map((c, ci) =>
    [...data.members.get(c.id)!].filter((id) => categories.every((o, oi) => oi === ci || !data.members.get(o.id)!.has(id))),
  );
  const order = categories.map((_, i) => i).sort((a, b) => exclusive[a].length - exclusive[b].length);

  const picked: number[][] = [];
  for (const ci of order) {
    const chosen: number[] = [];
    let candidates = exclusive[ci].slice();
    while (chosen.length < GROUP_SIZE) {
      candidates = candidates.filter((id) => {
        const evo = data.byId.get(id)!.evolution;
        return !chosen.includes(id) && !(evo.hasEvolutionFamily && usedChains.has(evo.chainId));
      });
      if (candidates.length === 0) return null;
      const id = pickWeighted(rng, candidates, (x) => (data.familiar.has(x) ? familiarWeight : 1));
      chosen.push(id);
      const evo = data.byId.get(id)!.evolution;
      if (evo.hasEvolutionFamily) usedChains.add(evo.chainId);
    }
    picked[ci] = chosen;
  }
  categories.forEach((c, ci) => groups.push({ categoryId: c.id, pokemonIds: picked[ci], tier: ci as Tier }));
  return groups;
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
