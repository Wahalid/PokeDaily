import type { DateKey } from "@/lib/daily/calendar";
import { isBaseSpecies } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { isFamiliar } from "@/lib/quartets/generator";
import { createRng, pickWeighted, type Rng } from "@/lib/random";
import { isNotable } from "@/lib/top10/generator";
import { IMPOSTOR_CATEGORIES, getImpostorCategory, type CategoryContext, type ImpostorCategory } from "./categories";
import { BOARD_SIZE, type ImpostorChallenge } from "./types";

/**
 * PokéImpostor board generator. Bump IMPOSTOR_VERSION if the output changes.
 *
 * A board is BUILT, never sampled blindly:
 *  1. pick a category for the day's level (weighted by its knowledge difficulty);
 *  2. members = Pokémon meeting it; candidates = the rest, minus debatable ones;
 *  3. every candidate gets a "deception" score from the data (near misses such
 *     as a mega/regional form with the type, a chain relative that qualifies, a
 *     value just under the threshold, shared types/generation with members…);
 *  4. pick recognizable members (one per evolution line) and the most deceptive
 *     recognizable impostors (never absurd ones: minimum deception);
 *  5. validate: exact membership (unique solution), recognizability, impostor
 *     quality, difficulty band of the day and recency; otherwise retry.
 */
export const IMPOSTOR_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Data preparation (once per dataset)
// ---------------------------------------------------------------------------

export interface PreparedCategory {
  category: ImpostorCategory;
  members: Pokemon[];
  /** Non-members that may appear as impostors (debatable ones removed). */
  outsiders: Pokemon[];
  ambiguous: Set<number>;
  deception: Map<number, number>;
  trick: Map<number, number>;
}

export interface ImpostorData {
  pool: Pokemon[];
  byId: Map<number, Pokemon>;
  familiar: Set<number>;
  notable: Set<number>;
  ctx: CategoryContext;
  categories: Map<string, PreparedCategory>;
}

function prepareCategory(category: ImpostorCategory, pool: readonly Pokemon[], ctx: CategoryContext): PreparedCategory {
  const ambiguous = new Set(pool.filter((p) => category.ambiguous?.(p)).map((p) => p.id));
  const usable = pool.filter((p) => !ambiguous.has(p.id));
  const members = usable.filter(category.test);
  const memberIds = new Set(members.map((p) => p.id));
  const outsiders = usable.filter((p) => !memberIds.has(p.id));
  const totals = members.map((p) => p.stats.total).sort((a, b) => a - b);
  const medianTotal = totals[Math.floor(totals.length / 2)] ?? 0;

  const deception = new Map<number, number>();
  for (const x of outsiders) {
    let sharesType = 0, sameGen = 0;
    for (const m of members) {
      if (m.types.some((t) => x.types.includes(t))) sharesType++;
      if (m.generation === x.generation) sameGen++;
    }
    const n = Math.max(1, members.length);
    const chainMember = (ctx.chains.get(x.evolution.chainId) ?? []).some((r) => r.id !== x.id && memberIds.has(r.id));
    const generic =
      (chainMember ? 1.5 : 0) + 1.5 * Math.min(1, (2 * sharesType) / n) + Math.min(1, (2 * sameGen) / n) * 0.75 + (Math.abs(x.stats.total - medianTotal) <= 50 ? 0.5 : 0);
    deception.set(x.id, Math.round(((category.nearMiss?.(x, ctx) ?? 0) + generic) * 100) / 100);
  }
  const trick = new Map(members.map((m) => [m.id, category.trick?.(m, ctx) ?? 0]));
  return { category, members, outsiders, ambiguous, deception, trick };
}

export function prepareImpostorData(pokemon: readonly Pokemon[]): ImpostorData {
  const pool = pokemon.filter(isBaseSpecies);
  const chains = new Map<number, Pokemon[]>();
  for (const p of pool) chains.set(p.evolution.chainId, [...(chains.get(p.evolution.chainId) ?? []), p]);
  const ctx: CategoryContext = { chains };
  return {
    pool,
    byId: new Map(pool.map((p) => [p.id, p])),
    familiar: new Set(pool.filter(isFamiliar).map((p) => p.id)),
    notable: new Set(pool.filter(isNotable).map((p) => p.id)),
    ctx,
    categories: new Map(IMPOSTOR_CATEGORIES.map((c) => [c.id, prepareCategory(c, pool, ctx)])),
  };
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------

export type ImpostorLevel = "easy" | "normal" | "hard";

/** Weekly curve (UTC weekday): Sun easy · Mon easy · Tue normal · Wed normal · Thu hard · Fri normal · Sat hard. */
export function impostorLevel(date: DateKey): ImpostorLevel {
  return (["easy", "easy", "normal", "normal", "hard", "normal", "hard"] as const)[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

export interface LevelConfig {
  correct: number;
  impostors: number;
  /** Category choice weight by knowledge difficulty 0…3. */
  categoryWeights: [number, number, number, number];
  /** Every impostor must be at least this tempting. */
  minDeception: number;
  minFamiliar: number;
  /** Accepted board difficulty score. */
  band: [number, number];
}

export const LEVELS: Record<ImpostorLevel, LevelConfig> = {
  easy: { correct: 8, impostors: 2, categoryWeights: [3, 2, 0.5, 0], minDeception: 1.75, minFamiliar: 6, band: [0, 2.3] },
  normal: { correct: 7, impostors: 3, categoryWeights: [1, 2, 2, 0.8], minDeception: 2, minFamiliar: 5, band: [1.7, 3.4] },
  hard: { correct: 6, impostors: 4, categoryWeights: [0.3, 1, 2, 2.5], minDeception: 2.25, minFamiliar: 4, band: [2.7, 99] },
};

/** No board ever has a weaker impostor than this, whatever the level. */
export const MIN_DECEPTION = 1.5;
export const MIN_NOTABLE = 7;

const famWeight = (data: ImpostorData, id: number) => (data.familiar.has(id) ? 3 : data.notable.has(id) ? 1.2 : 0.25);

/** Impostor deception on a given board: category score + links to the members shown. */
export function boardDeception(prep: PreparedCategory, data: ImpostorData, id: number, members: readonly number[]): number {
  const x = data.byId.get(id)!;
  const shown = members.map((m) => data.byId.get(m)!);
  const chainLink = shown.some((m) => m.evolution.chainId === x.evolution.chainId) ? 1 : 0;
  const typeLink = shown.filter((m) => m.types.some((t) => x.types.includes(t))).length >= 2 ? 0.5 : 0;
  return (prep.deception.get(id) ?? 0) + chainLink + typeLink;
}

export interface ImpostorAnalysis {
  /** Structural problems: the board is invalid. */
  problems: string[];
  /** Quality problems: valid but not good enough. */
  quality: string[];
  score: number;
  familiar: number;
  notable: number;
  /** Lowest board deception among impostors. */
  weakestImpostor: number;
  meanDeception: number;
}

export function analyzeImpostor(challenge: ImpostorChallenge, data: ImpostorData, level?: ImpostorLevel): ImpostorAnalysis {
  const problems: string[] = [];
  const quality: string[] = [];
  const prep = data.categories.get(challenge.categoryId);
  const empty = { problems: ["unknown-category"], quality, score: 0, familiar: 0, notable: 0, weakestImpostor: 0, meanDeception: 0 };
  if (!prep) return empty;
  const cards = challenge.cards.map((id) => data.byId.get(id));
  if (cards.some((p) => !p)) return { ...empty, problems: ["unknown-pokemon"] };
  const pokemon = cards as Pokemon[];

  if (pokemon.length !== BOARD_SIZE) problems.push("wrong-size");
  if (new Set(challenge.cards).size !== challenge.cards.length) problems.push("duplicate-pokemon");
  if (new Set(pokemon.map((p) => p.name)).size !== pokemon.length) problems.push("duplicate-name");
  if (pokemon.some((p) => !isBaseSpecies(p))) problems.push("not-base-species");
  if (pokemon.some((p) => prep.ambiguous.has(p.id))) problems.push("ambiguous-pokemon");
  const impostorSet = new Set(challenge.impostors);
  if (challenge.impostors.some((id) => !challenge.cards.includes(id)) || impostorSet.size !== challenge.impostors.length) problems.push("bad-impostors");
  // Unique solution: membership recomputed from the data must match exactly.
  for (const p of pokemon) if (prep.category.test(p) === impostorSet.has(p.id)) problems.push(`membership-mismatch:${p.slug}`);
  const members = challenge.cards.filter((id) => !impostorSet.has(id));
  if (members.length === 0 || impostorSet.size === 0) problems.push("one-sided-board");
  if (!members.includes(challenge.hintId)) problems.push("hint-not-correct");

  const familiar = challenge.cards.filter((id) => data.familiar.has(id)).length;
  const notable = challenge.cards.filter((id) => data.notable.has(id)).length;
  const decs = challenge.impostors.map((id) => boardDeception(prep, data, id, members));
  const weakestImpostor = decs.length ? Math.min(...decs) : 0;
  const meanDeception = decs.length ? decs.reduce((s, d) => s + d, 0) / decs.length : 0;
  const meanTrick = members.reduce((s, id) => s + (prep.trick.get(id) ?? 0), 0) / Math.max(1, members.length);
  const score =
    Math.round(
      (0.7 * prep.category.difficulty + 0.3 * meanDeception + 0.5 * meanTrick + 1.5 * (1 - familiar / BOARD_SIZE) + 0.3 * (impostorSet.size - 2)) * 100,
    ) / 100;

  const chainsOf = (ids: number[]) => ids.map((id) => data.byId.get(id)!.evolution.chainId);
  if (new Set(chainsOf(members)).size !== members.length || new Set(chainsOf(challenge.impostors)).size !== challenge.impostors.length) {
    quality.push("same-evolution-line");
  }
  if (notable < MIN_NOTABLE) quality.push("too-obscure");
  if (weakestImpostor < MIN_DECEPTION) quality.push("obvious-impostor");
  if (level) {
    const cfg = LEVELS[level];
    if (members.length !== cfg.correct || impostorSet.size !== cfg.impostors) quality.push("wrong-layout");
    if (familiar < cfg.minFamiliar) quality.push("too-unfamiliar");
    if (weakestImpostor < cfg.minDeception) quality.push("weak-impostor-for-level");
    if (score < cfg.band[0] || score > cfg.band[1]) quality.push("wrong-difficulty-for-day");
  }
  return { problems, quality, score, familiar, notable, weakestImpostor, meanDeception };
}

// ---------------------------------------------------------------------------
// Recency
// ---------------------------------------------------------------------------

export interface ImpostorRecency {
  /** A category is not reused within this many days. */
  categoryDays: number;
  /** Not the same category family as yesterday; at most `typeFamilyMax` type categories per `typeFamilyDays`. */
  sameFamilyYesterday: boolean;
  typeFamilyDays: number;
  typeFamilyMax: number;
  /** A Pokémon is not shown again within this many days. */
  pokemonDays: number;
  /** A Pokémon shown this many times in the last `overlapDays` rests until it falls out of the window. */
  maxUses: number;
  /** Max Pokémon shared with any board of the last `overlapDays`. */
  maxOverlap: number;
  overlapDays: number;
}

export const DEFAULT_IMPOSTOR_RECENCY: ImpostorRecency = {
  categoryDays: 30,
  sameFamilyYesterday: false,
  typeFamilyDays: 7,
  typeFamilyMax: 2,
  pokemonDays: 7,
  maxUses: 3,
  maxOverlap: 3,
  overlapDays: 45,
};
const RELAXED_RECENCY: ImpostorRecency = { ...DEFAULT_IMPOSTOR_RECENCY, categoryDays: 10, typeFamilyMax: 3, pokemonDays: 3, maxUses: 4, maxOverlap: 4, overlapDays: 14 };

/** Days the generator needs to look back. */
export const RECENCY_WINDOW = Math.max(DEFAULT_IMPOSTOR_RECENCY.categoryDays, DEFAULT_IMPOSTOR_RECENCY.overlapDays);

/** Pokémon that can't be shown today: seen in the last few days, or already shown `maxUses` times recently. */
export function bannedPokemon(recent: ReadonlyArray<ImpostorChallenge | null>, r: ImpostorRecency): Set<number> {
  const banned = new Set(recent.slice(0, r.pokemonDays).flatMap((c) => c?.cards ?? []));
  const uses = new Map<number, number>();
  for (const c of recent.slice(0, r.overlapDays)) for (const id of c?.cards ?? []) uses.set(id, (uses.get(id) ?? 0) + 1);
  for (const [id, n] of uses) if (n >= r.maxUses) banned.add(id);
  return banned;
}

export function recencyProblems(challenge: ImpostorChallenge, recent: ReadonlyArray<ImpostorChallenge | null>, r: ImpostorRecency): string[] {
  const out: string[] = [];
  const family = getImpostorCategory(challenge.categoryId)?.family;
  if (recent.slice(0, r.categoryDays).some((c) => c?.categoryId === challenge.categoryId)) out.push("category-used-recently");
  const yesterday = recent[0] ? getImpostorCategory(recent[0].categoryId)?.family : undefined;
  if (!r.sameFamilyYesterday && yesterday && yesterday === family) out.push("same-family-as-yesterday");
  if (family === "type") {
    const types = recent.slice(0, r.typeFamilyDays - 1).filter((c) => c && getImpostorCategory(c.categoryId)?.family === "type").length;
    if (types + 1 > r.typeFamilyMax) out.push("too-many-type-days");
  }
  const cards = new Set(challenge.cards);
  if (recent.slice(0, r.pokemonDays).some((c) => c?.cards.some((id) => cards.has(id)))) out.push("pokemon-shown-recently");
  if (recent.slice(0, r.overlapDays).some((c) => c && c.cards.filter((id) => cards.has(id)).length > r.maxOverlap)) out.push("similar-board");
  return out;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

function sample<T extends { id: number }>(rng: Rng, items: readonly T[], count: number, weight: (item: T) => number, key: (item: T) => number): T[] {
  const chosen: T[] = [];
  const usedKeys = new Set<number>();
  let left = items.filter((i) => weight(i) > 0);
  while (chosen.length < count && left.length > 0) {
    const pick = pickWeighted(rng, left, weight);
    chosen.push(pick);
    usedKeys.add(key(pick));
    left = left.filter((i) => i.id !== pick.id && !usedKeys.has(key(i)));
  }
  return chosen;
}

/** Builds one candidate board for a category (or null if the category can't fill it). */
export function buildBoard(rng: Rng, prep: PreparedCategory, data: ImpostorData, level: ImpostorLevel, banned: ReadonlySet<number>): ImpostorChallenge | null {
  const cfg = LEVELS[level];
  const chain = (p: Pokemon) => p.evolution.chainId;
  const trickFactor = (id: number) => {
    const t = prep.trick.get(id) ?? 0;
    return level === "hard" ? 1 + t : level === "easy" ? 1 / (1 + t) : 1;
  };
  const members = sample(rng, prep.members.filter((p) => !banned.has(p.id)), cfg.correct, (p) => famWeight(data, p.id) * trickFactor(p.id), chain);
  if (members.length < cfg.correct) return null;
  const memberIds = members.map((p) => p.id);
  const candidates = prep.outsiders.filter(
    (p) => !banned.has(p.id) && data.notable.has(p.id) && boardDeception(prep, data, p.id, memberIds) >= cfg.minDeception,
  );
  // Easy days favour fair, moderate impostors; harder days the most devious ones.
  const impostorWeight = (p: Pokemon) => {
    const d = boardDeception(prep, data, p.id, memberIds);
    return famWeight(data, p.id) * (level === "easy" ? Math.max(0.2, 3.5 - d) : level === "normal" ? d ** 2 : d ** 3);
  };
  const impostors = sample(rng, candidates, cfg.impostors, impostorWeight, chain);
  if (impostors.length < cfg.impostors) return null;

  const cards = [...memberIds, ...impostors.map((p) => p.id)];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  // Help card: the least obvious correct Pokémon (most "tricky", then least familiar, then lowest id).
  const hintId = [...memberIds].sort(
    (a, b) => (prep.trick.get(b) ?? 0) - (prep.trick.get(a) ?? 0) || famWeight(data, a) - famWeight(data, b) || a - b,
  )[0];
  return { categoryId: prep.category.id, cards, impostors: impostors.map((p) => p.id).sort((a, b) => a - b), hintId };
}

export interface ImpostorGeneration {
  challenge: ImpostorChallenge;
  analysis: ImpostorAnalysis;
  /** 0 normal · 1 relaxed recency · 2 any difficulty · 3 no recency · 4 safe board. */
  fallbackStep: number;
  attempts: number;
  rejections: Record<string, number>;
}

const MAX_ATTEMPTS = 400;
const MAX_CATEGORY_FAILURES = 40;

/**
 * Share of days per category family (split evenly among the family's categories),
 * so big families (18 types, 12 abilities) don't crowd out the rest.
 */
export const FAMILY_SHARE: Record<ImpostorCategory["family"], number> = {
  type: 3,
  generation: 2.5,
  classification: 2,
  evolution: 0.8,
  "can-evolve": 0.8,
  "two-types": 0.6,
  "dual-type": 1,
  ability: 0.7,
  measure: 1.2,
  total: 0.4,
  color: 0,
};

/** A category is feasible for a level when it has enough recognizable members. */
export function feasibleCategories(data: ImpostorData, level: ImpostorLevel): PreparedCategory[] {
  const cfg = LEVELS[level];
  return [...data.categories.values()].filter(
    (c) => cfg.categoryWeights[c.category.difficulty] > 0 && c.members.filter((p) => data.notable.has(p.id)).length >= cfg.correct + 3,
  );
}

export function generateImpostor(input: {
  seed: string;
  data: ImpostorData;
  level: ImpostorLevel;
  recent: ReadonlyArray<ImpostorChallenge | null>;
}): ImpostorGeneration {
  const { data, level, recent } = input;
  const rejections: Record<string, number> = {};
  const reject = (reasons: string[]) => reasons.forEach((r) => (rejections[r.split(":")[0]] = (rejections[r.split(":")[0]] ?? 0) + 1));
  const steps: Array<{ recency: ImpostorRecency | null; level: ImpostorLevel | undefined }> = [
    { recency: DEFAULT_IMPOSTOR_RECENCY, level },
    { recency: RELAXED_RECENCY, level },
    { recency: RELAXED_RECENCY, level: undefined },
    { recency: null, level: undefined },
  ];
  let attempts = 0;
  for (let step = 0; step < steps.length; step++) {
    const rng = createRng(`${input.seed}:${step}`);
    const { recency } = steps[step];
    const banned = recency ? bannedPokemon(recent, recency) : new Set<number>();
    const categories = feasibleCategories(data, level);
    const familySize = new Map<string, number>();
    for (const c of categories) familySize.set(c.category.family, (familySize.get(c.category.family) ?? 0) + 1);
    const categoryWeight = (c: PreparedCategory) =>
      (LEVELS[level].categoryWeights[c.category.difficulty] * FAMILY_SHARE[c.category.family]) / familySize.get(c.category.family)!;
    // Categories blocked by recency (same category / family rules) are filtered before drawing.
    let allowed = recency
      ? categories.filter((c) => recencyProblems({ categoryId: c.category.id, cards: [], impostors: [], hintId: 0 }, recent, recency).length === 0)
      : categories;
    const failures = new Map<string, number>();
    for (let i = 0; i < MAX_ATTEMPTS && allowed.length > 0; i++) {
      attempts++;
      const prep = pickWeighted(rng, allowed, categoryWeight);
      // A category that keeps failing today is dropped, so the others get the attempts.
      const fail = () => {
        failures.set(prep.category.id, (failures.get(prep.category.id) ?? 0) + 1);
        if (failures.get(prep.category.id)! >= MAX_CATEGORY_FAILURES) allowed = allowed.filter((c) => c !== prep);
      };
      const challenge = buildBoard(rng, prep, data, level, banned);
      if (!challenge) {
        reject(["cannot-fill-board"]);
        fail();
        continue;
      }
      const analysis = analyzeImpostor(challenge, data, steps[step].level);
      const issues = [...analysis.problems, ...analysis.quality.filter((q) => steps[step].level || q !== "wrong-layout"), ...(recency ? recencyProblems(challenge, recent, recency) : [])];
      if (issues.length) {
        reject(issues);
        fail();
        continue;
      }
      return { challenge, analysis, fallbackStep: step, attempts, rejections };
    }
  }
  const challenge = safeImpostor(data);
  return { challenge, analysis: analyzeImpostor(challenge, data), fallbackStep: 4, attempts, rejections };
}

/** Last resort: a fixed, hand-checkable category built without recency. */
export function safeImpostor(data: ImpostorData): ImpostorChallenge {
  const prep = data.categories.get("type:dragon")!;
  for (let i = 0; i < 1000; i++) {
    const board = buildBoard(createRng(`pokedaily:impostor:safe:${i}`), prep, data, "easy", new Set());
    if (board && analyzeImpostor(board, data, "easy").problems.length === 0 && analyzeImpostor(board, data).quality.length === 0) return board;
  }
  throw new Error("PokéImpostor: no safe board could be built");
}
