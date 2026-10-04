import { isFamiliar, type QuartetsData } from "@/lib/quartets/generator";
import type { Pokemon } from "@/lib/pokemon/types";
import { createRng, pickWeighted } from "@/lib/random";
import { getTop10Filter, TOP10_FILTERS, type Top10Filter } from "./filters";
import { getMetric, METRICS, rankPokemon, type Metric, type MetricVariant } from "./metrics";
import { TOP_SIZE, type Direction, type Top10Challenge } from "./types";

/**
 * Top 10 generator (server / scripts only) — a DEDUCTION game:
 * [SET OF POKÉMON] + [INTUITIVE METRIC], with each position's type(s) as clue.
 *
 * 1. draw a (set, metric, direction) combination — sets are generations and a
 *    few themes (never types); metrics weighted towards weight / height /
 *    speed / HP, with Sp. Atk / Sp. Def rare;
 * 2. rank the set (tie rule in metrics.ts) and take the top 10;
 * 3. validate it as a GAME: ≥20 candidates, no tie at the 10/11 boundary,
 *    enough distinct values, ≥6 notable Pokémon, a notable #1, varied type
 *    clues, difficulty fitting the weekday, variety vs. recent days;
 * 4. retry; relax; finally use the pre-validated SAFE_TOP10.
 */
export const TOP10_VERSION = "2.0.0";

/** A set needs at least this many species so the Top 10 is a real selection. */
export const MIN_CANDIDATES = 20;
const MIN_DISTINCT_VALUES = 6;
/** At least this many of the 10 must be "notable" (see isNotable). */
export const MIN_NOTABLE = 6;
/** Type clues must distinguish positions: at least this many different type combinations. */
export const MIN_DISTINCT_CLUES = 5;

/**
 * Recognisability within a set: generations I–IV, starters, legendaries,
 * mythicals and final evolutions (the memorable end of each line). The global
 * "familiar" proxy alone rules out generations V–IX entirely.
 */
export function isNotable(p: Pokemon): boolean {
  return (
    isFamiliar(p) ||
    p.flags.isStarter ||
    p.flags.isLegendary ||
    p.flags.isMythical ||
    (p.evolution.hasEvolutionFamily && p.evolution.evolvesTo.length === 0)
  );
}

/** Weekly curve: Mon easy · Tue easy/normal · Wed–Thu normal · Fri normal/hard · Sat hard · Sun normal. */
export type Top10Level = "easy" | "easy-normal" | "normal" | "normal-hard" | "hard";

export function top10Level(date: string): Top10Level {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return (["normal", "easy", "easy-normal", "normal", "normal", "normal-hard", "hard"] as const)[weekday];
}

/** Score bands per level (score = metric + set difficulty + 1.5 × unnotable share). */
const LEVEL_BANDS: Record<Top10Level, [number, number]> = {
  easy: [0, 0.8],
  "easy-normal": [0, 1.4],
  normal: [0.3, 1.9],
  "normal-hard": [0.8, 2.6],
  hard: [1.3, 9],
};

export interface Top10Recency {
  /** Same set not within this many days. */
  filterDays: number;
  /** Same metric not on consecutive days. */
  metricDays: number;
  /** Same (set, metric, direction) not within this many days. */
  comboDays: number;
  /** A Top 10 sharing more than this many Pokémon with one of the last `overlapDays` is rejected. */
  maxOverlap: number;
  overlapDays: number;
}

/**
 * Only ~90 (set, metric, direction) combinations survive the tie rule, so the
 * variety rules are sized to that pool (measured over 365 days).
 */
export const DEFAULT_TOP10_RECENCY: Top10Recency = { filterDays: 2, metricDays: 1, comboDays: 30, maxOverlap: 5, overlapDays: 14 };

/** Looser variety used by the first fallback step — game quality and day difficulty are still enforced. */
const RELAXED_RECENCY: Top10Recency = { filterDays: 1, metricDays: 1, comboDays: 10, maxOverlap: 7, overlapDays: 3 };

export interface Top10Analysis {
  problems: string[];
  quality: string[];
  candidates: number;
  notable: number;
  distinctValues: number;
  distinctClues: number;
  score: number;
}

/** Ranks a set's species by metric (for generation and validation). Base species only. */
export function computeRanking(data: QuartetsData, filterId: string, metric: Metric, direction: Direction) {
  const filter = getTop10Filter(filterId);
  const members = data.members.get(filterId);
  const inSet = filter?.test ?? ((p: Pokemon) => members?.has(p.id) ?? false);
  return rankPokemon(data.pool.filter(inSet), metric, direction);
}

export function analyzeTop10(challenge: Top10Challenge, data: QuartetsData, level?: Top10Level): Top10Analysis {
  const problems: string[] = [];
  const quality: string[] = [];
  const filter = getTop10Filter(challenge.filterId);
  const metric = getMetric(challenge.metric);
  const variant: MetricVariant | undefined = metric?.directions[challenge.direction];
  if (!filter || (!filter.test && !data.members.has(challenge.filterId))) problems.push("unknown set (types are not allowed as sets)");
  if (!metric || !variant) problems.push("unknown metric/direction");
  if (problems.length) return { problems, quality, candidates: 0, notable: 0, distinctValues: 0, distinctClues: 0, score: 0 };

  const ranked = computeRanking(data, challenge.filterId, metric!, challenge.direction);
  const top = ranked.slice(0, TOP_SIZE);
  if (ranked.length < MIN_CANDIDATES) problems.push("too few candidates");
  if (ranked.length > TOP_SIZE && ranked[TOP_SIZE - 1].value === ranked[TOP_SIZE].value) problems.push("tie at the 10/11 boundary");
  if (challenge.ranking.length !== TOP_SIZE) problems.push("ranking must have 10 entries");
  if (top.some((e, i) => challenge.ranking[i]?.id !== e.pokemon.id || challenge.ranking[i]?.value !== e.value)) {
    problems.push("ranking does not match the data");
  }

  const distinctValues = new Set(top.map((e) => e.value)).size;
  const notable = top.filter((e) => isNotable(e.pokemon)).length;
  const distinctClues = new Set(top.map((e) => e.pokemon.types.join("/"))).size;
  const score = variant!.difficulty + filter!.difficulty + 1.5 * (1 - notable / TOP_SIZE);
  if (distinctValues < MIN_DISTINCT_VALUES) quality.push("too-many-ties");
  if (notable < MIN_NOTABLE) quality.push("too-obscure");
  if (top[0] && !isNotable(top[0].pokemon)) quality.push("number-one-not-deducible");
  if (distinctClues < MIN_DISTINCT_CLUES) quality.push("type-clues-too-uniform");
  if (level) {
    const [min, max] = LEVEL_BANDS[level];
    if (score < min || score > max) quality.push("wrong-difficulty-for-day");
  }
  return { problems, quality, candidates: ranked.length, notable, distinctValues, distinctClues, score };
}

export interface Top10GeneratorOptions {
  seed: string;
  data: QuartetsData;
  level: Top10Level;
  /** Previous days' challenges, most recent first. */
  recent?: ReadonlyArray<Top10Challenge | null>;
  recency?: Top10Recency;
  strictness?: "full" | "structural";
  maxAttempts?: number;
}

export interface Top10GenerationResult {
  challenge: Top10Challenge;
  analysis: Top10Analysis;
  attempts: number;
  rejections: Record<string, number>;
}

export class Top10GenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly rejections: Record<string, number>,
  ) {
    super(message);
  }
}

interface Combo {
  filter: Top10Filter;
  metric: Metric;
  direction: Direction;
  weight: number;
}

const COMBOS: readonly Combo[] = TOP10_FILTERS.flatMap((filter) =>
  METRICS.flatMap((metric) =>
    (Object.entries(metric.directions) as Array<[Direction, MetricVariant]>).map(([direction, variant]) => ({
      filter,
      metric,
      direction,
      weight: filter.weight * variant.weight,
    })),
  ),
);

export function generateTop10(options: Top10GeneratorOptions): Top10GenerationResult {
  const { seed, data, level, recent = [], recency = DEFAULT_TOP10_RECENCY } = options;
  const strictness = options.strictness ?? "full";
  const maxAttempts = options.maxAttempts ?? 1500;
  const rng = createRng(seed);
  const rejections: Record<string, number> = {};
  const reject = (reason: string) => (rejections[reason] = (rejections[reason] ?? 0) + 1);
  const within = (days: number) => recent.slice(0, days).filter((c): c is Top10Challenge => c !== null);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const { filter, metric, direction } = pickWeighted(rng, COMBOS, (c) => c.weight);
    if (within(recency.filterDays).some((c) => c.filterId === filter.id)) {
      reject("set-used-recently");
      continue;
    }
    if (within(recency.metricDays).some((c) => c.metric === metric.id)) {
      reject("metric-used-yesterday");
      continue;
    }
    if (within(recency.comboDays).some((c) => c.filterId === filter.id && c.metric === metric.id && c.direction === direction)) {
      reject("same-ranking-recently");
      continue;
    }

    const ranked = computeRanking(data, filter.id, metric, direction);
    const challenge: Top10Challenge = {
      filterId: filter.id,
      metric: metric.id,
      direction,
      ranking: ranked.slice(0, TOP_SIZE).map((e) => ({ id: e.pokemon.id, value: e.value })),
    };
    const ids = new Set(challenge.ranking.map((e) => e.id));
    if (within(recency.overlapDays).some((c) => c.ranking.filter((e) => ids.has(e.id)).length > recency.maxOverlap)) {
      reject("overlaps-recent-top10");
      continue;
    }
    const analysis = analyzeTop10(challenge, data, strictness === "full" ? level : undefined);
    if (analysis.problems.length) {
      reject(analysis.problems[0]);
      continue;
    }
    if (strictness === "full" && analysis.quality.length) {
      reject(analysis.quality[0]);
      continue;
    }
    return { challenge, analysis, attempts: attempt, rejections };
  }
  throw new Top10GenerationError(`No valid Top 10 for seed "${seed}"`, maxAttempts, rejections);
}

/** Pre-validated last resort (checked by `npm run verify`): the heaviest Pokémon of Generation I. */
export const SAFE_TOP10_CRITERION = { filterId: "gen:1", metric: "weight", direction: "desc" as Direction };

export function safeTop10(data: QuartetsData): Top10Challenge {
  const { filterId, metric, direction } = SAFE_TOP10_CRITERION;
  const ranked = computeRanking(data, filterId, getMetric(metric)!, direction);
  return { filterId, metric, direction, ranking: ranked.slice(0, TOP_SIZE).map((e) => ({ id: e.pokemon.id, value: e.value })) };
}

export interface SafeTop10Result extends Top10GenerationResult {
  /** 0 = normal path, 1 = relaxed variety (quality kept), 2 = structural rules only, 3 = no recency, 4 = SAFE. */
  fallbackStep: number;
}

/** Like generateTop10, but never throws. */
export function generateTop10Safe(options: Top10GeneratorOptions): SafeTop10Result {
  const ladder: Array<Partial<Top10GeneratorOptions>> = [
    {},
    { recency: RELAXED_RECENCY, seed: `${options.seed}:relaxed` },
    { strictness: "structural", seed: `${options.seed}:structural` },
    { strictness: "structural", recent: [], seed: `${options.seed}:no-recency` },
  ];
  const rejections: Record<string, number> = {};
  let attempts = 0;
  for (let step = 0; step < ladder.length; step++) {
    try {
      const result = generateTop10({ ...options, ...ladder[step] });
      return { ...result, attempts: attempts + result.attempts, fallbackStep: step };
    } catch (error) {
      if (error instanceof Top10GenerationError) {
        attempts += error.attempts;
        for (const [k, v] of Object.entries(error.rejections)) rejections[k] = (rejections[k] ?? 0) + v;
      }
    }
  }
  const challenge = safeTop10(options.data);
  return { challenge, analysis: analyzeTop10(challenge, options.data), attempts, rejections, fallbackStep: ladder.length };
}
