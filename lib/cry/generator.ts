import { isBaseSpecies } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { isFamiliar } from "@/lib/quartets/generator";
import { createRng, pickWeighted, type Rng } from "@/lib/random";
import { isNotable } from "@/lib/top10/generator";
import { CRY_OPTIONS, CRY_ROUNDS, type CryChallenge, type CryDifficulty, type CryRound } from "./types";

/**
 * PokéCry daily generator. Bump CRY_VERSION if the output changes.
 *
 * A day = 5 rounds on a small difficulty curve (always starts easy, always has
 * hard rounds, never all easy / all hard). Each round:
 *  1. answer: easy → familiar Pokémon; normal → recognizable; hard → any
 *     recognizable species, less familiar ones welcome;
 *  2. three distractors, always recognizable, chosen by data similarity to the
 *     answer (evolution family, shared type, generation, colour, size): easy
 *     rounds use plausible but different-family options, hard rounds the
 *     closest ones (relatives, same type & generation) — e.g. Pikachu with
 *     Pichu / Raichu / Plusle;
 *  3. constraints: 20 distinct Pokémon per day, one evolution family per day,
 *     ≤ 2 answers from the same generation, answers not repeated for
 *     ANSWER_REPEAT_DAYS, options not shown again for OPTION_REPEAT_DAYS,
 *     and every answer must have a playable cry (`hasCry`).
 */
export const CRY_VERSION = "1.0.0";

export const ANSWER_REPEAT_DAYS = 120;
export const OPTION_REPEAT_DAYS = 3;
const MAX_SAME_GENERATION = 2;

/** Day templates (round 1 → 5). Weighted; the spec's curve is the most common. */
export const CURVES: ReadonlyArray<{ curve: CryDifficulty[]; weight: number }> = [
  { curve: ["easy", "normal", "normal", "hard", "hard"], weight: 4 },
  { curve: ["easy", "easy", "normal", "hard", "hard"], weight: 2 },
  { curve: ["easy", "normal", "normal", "normal", "hard"], weight: 2 },
  { curve: ["easy", "normal", "hard", "normal", "hard"], weight: 2 },
];

/** Similarity window per difficulty (data-based "how confusable" score of a distractor). */
const SIMILARITY: Record<CryDifficulty, { min: number; max: number; sameFamily: boolean }> = {
  easy: { min: 1, max: 2.75, sameFamily: false },
  normal: { min: 1.75, max: 4, sameFamily: false },
  hard: { min: 2.5, max: 99, sameFamily: true },
};

export interface CryData {
  pool: Pokemon[];
  byId: Map<number, Pokemon>;
  familiar: Set<number>;
  notable: Set<number>;
}

export function prepareCryData(pokemon: readonly Pokemon[]): CryData {
  const pool = pokemon.filter(isBaseSpecies);
  return {
    pool,
    byId: new Map(pool.map((p) => [p.id, p])),
    familiar: new Set(pool.filter(isFamiliar).map((p) => p.id)),
    notable: new Set(pool.filter(isNotable).map((p) => p.id)),
  };
}

const sizeClass = (p: Pokemon) => (p.height < 6 ? 0 : p.height < 15 ? 1 : 2);

/** How plausible `x` is as a distractor for `answer` (0 unrelated … ~6 very close). */
export function similarity(answer: Pokemon, x: Pokemon): number {
  let s = 0;
  if (answer.evolution.chainId === x.evolution.chainId) s += 3;
  if (answer.types.some((t) => x.types.includes(t))) s += 1.5;
  if (answer.types[0] === x.types[0]) s += 0.5;
  if (answer.generation === x.generation) s += 1;
  if (answer.color === x.color) s += 0.5;
  if (sizeClass(answer) === sizeClass(x)) s += 0.5;
  return s;
}

/** Answer weight by round difficulty (familiarity shapes difficulty as much as the options). */
function answerWeight(data: CryData, p: Pokemon, d: CryDifficulty): number {
  const familiar = data.familiar.has(p.id);
  const notable = data.notable.has(p.id);
  if (d === "easy") return familiar ? (p.flags.isStarter || p.flags.isLegendary ? 2 : 1) : 0;
  if (d === "normal") return familiar ? 2 : notable ? 1 : 0;
  return notable ? (familiar ? 1 : 1.5) : 0;
}

export interface CryAnalysis {
  problems: string[];
  /** Mean distractor similarity per round. */
  roundSimilarity: number[];
  /** Day difficulty 0 … ~3 (answer unfamiliarity + distractor closeness). */
  score: number;
}

export function analyzeCry(c: CryChallenge, data: CryData, hasCry: (id: number) => boolean = () => true): CryAnalysis {
  const problems: string[] = [];
  if (!Array.isArray(c.rounds) || c.rounds.length !== CRY_ROUNDS) return { problems: ["wrong-round-count"], roundSimilarity: [], score: 0 };
  const all: number[] = [];
  const roundSimilarity: number[] = [];
  let score = 0;
  for (const [i, r] of c.rounds.entries()) {
    if (r.options.length !== CRY_OPTIONS) problems.push(`round-${i + 1}:wrong-option-count`);
    if (new Set(r.options).size !== r.options.length) problems.push(`round-${i + 1}:duplicate-option`);
    if (r.options.filter((id) => id === r.answer).length !== 1) problems.push(`round-${i + 1}:answer-not-exactly-once`);
    if (r.options.some((id) => !data.byId.get(id))) problems.push(`round-${i + 1}:unknown-pokemon`);
    if (!hasCry(r.answer)) problems.push(`round-${i + 1}:no-cry`);
    all.push(...r.options);
    const answer = data.byId.get(r.answer);
    if (answer) {
      const sims = r.options.filter((id) => id !== r.answer).map((id) => similarity(answer, data.byId.get(id) ?? answer));
      const mean = sims.reduce((s, x) => s + x, 0) / Math.max(1, sims.length);
      roundSimilarity.push(Math.round(mean * 100) / 100);
      score += (data.familiar.has(r.answer) ? 0 : 0.6) + mean / 4;
    }
  }
  if (new Set(all).size !== all.length) problems.push("pokemon-repeated-in-day");
  const families = c.rounds.map((r) => new Set(r.options.map((id) => data.byId.get(id)?.evolution.chainId)));
  for (let i = 0; i < families.length; i++) {
    for (let j = i + 1; j < families.length; j++) if ([...families[i]].some((f) => families[j].has(f))) problems.push("family-in-two-rounds");
  }
  return { problems: [...new Set(problems)], roundSimilarity, score: Math.round((score / CRY_ROUNDS) * 100) / 100 };
}

function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export interface CryGeneration {
  challenge: CryChallenge;
  analysis: CryAnalysis;
  /** 0 normal · 1 relaxed recency · 2 no recency. */
  fallbackStep: number;
  attempts: number;
  rejections: Record<string, number>;
}

const MAX_ATTEMPTS = 60;

/** Builds one round, or null with a reason. */
function buildRound(
  rng: Rng,
  data: CryData,
  difficulty: CryDifficulty,
  used: { ids: Set<number>; chains: Set<number>; gens: Map<number, number> },
  banned: { answers: Set<number>; options: Set<number> },
  hasCry: (id: number) => boolean,
): CryRound | string {
  const answers = data.pool.filter(
    (p) =>
      answerWeight(data, p, difficulty) > 0 &&
      hasCry(p.id) &&
      !banned.answers.has(p.id) &&
      !banned.options.has(p.id) &&
      !used.ids.has(p.id) &&
      !used.chains.has(p.evolution.chainId) &&
      (used.gens.get(p.generation) ?? 0) < MAX_SAME_GENERATION,
  );
  if (answers.length === 0) return "no-answer-available";
  const answer = pickWeighted(rng, answers, (p) => answerWeight(data, p, difficulty));
  const win = SIMILARITY[difficulty];
  const candidates = data.pool.filter((x) => {
    if (x.id === answer.id || !data.notable.has(x.id) || used.ids.has(x.id) || banned.options.has(x.id)) return false;
    const sameFamily = x.evolution.chainId === answer.evolution.chainId;
    if (!sameFamily && used.chains.has(x.evolution.chainId)) return false;
    if (sameFamily && !win.sameFamily) return false;
    const s = similarity(answer, x);
    return s >= win.min && s <= win.max;
  });
  const distractors: Pokemon[] = [];
  let left = candidates;
  while (distractors.length < CRY_OPTIONS - 1 && left.length > 0) {
    const pick = pickWeighted(rng, left, (x) => (difficulty === "hard" ? similarity(answer, x) ** 2 : 1) * (data.familiar.has(x.id) ? 2 : 1));
    distractors.push(pick);
    // At most 2 options from the same family besides the answer's own (keeps rounds fair).
    left = left.filter((x) => x.id !== pick.id && (x.evolution.chainId === answer.evolution.chainId || x.evolution.chainId !== pick.evolution.chainId));
  }
  if (distractors.length < CRY_OPTIONS - 1) return "not-enough-plausible-distractors";
  return { answer: answer.id, options: shuffle(rng, [answer.id, ...distractors.map((d) => d.id)]), difficulty };
}

export function generateCry(input: {
  seed: string;
  data: CryData;
  recent: ReadonlyArray<CryChallenge | null>;
  hasCry?: (id: number) => boolean;
}): CryGeneration {
  const { data, recent } = input;
  const hasCry = input.hasCry ?? (() => true);
  const rejections: Record<string, number> = {};
  const steps: Array<{ answerDays: number; optionDays: number }> = [
    { answerDays: ANSWER_REPEAT_DAYS, optionDays: OPTION_REPEAT_DAYS },
    { answerDays: 30, optionDays: 1 },
    { answerDays: 0, optionDays: 0 },
  ];
  let attempts = 0;
  for (let step = 0; step < steps.length; step++) {
    const rng = createRng(`${input.seed}:${step}`);
    const banned = {
      answers: new Set(recent.slice(0, steps[step].answerDays).flatMap((c) => c?.rounds.map((r) => r.answer) ?? [])),
      options: new Set(recent.slice(0, steps[step].optionDays).flatMap((c) => c?.rounds.flatMap((r) => r.options) ?? [])),
    };
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      attempts++;
      const curve = pickWeighted(rng, CURVES, (c) => c.weight).curve;
      const used = { ids: new Set<number>(), chains: new Set<number>(), gens: new Map<number, number>() };
      const rounds: CryRound[] = [];
      let failure: string | null = null;
      for (const difficulty of curve) {
        const r = buildRound(rng, data, difficulty, used, banned, hasCry);
        if (typeof r === "string") {
          failure = r;
          break;
        }
        rounds.push(r);
        for (const id of r.options) {
          used.ids.add(id);
          used.chains.add(data.byId.get(id)!.evolution.chainId);
        }
        const gen = data.byId.get(r.answer)!.generation;
        used.gens.set(gen, (used.gens.get(gen) ?? 0) + 1);
      }
      if (failure) {
        rejections[failure] = (rejections[failure] ?? 0) + 1;
        continue;
      }
      const challenge = { rounds };
      const analysis = analyzeCry(challenge, data, hasCry);
      if (analysis.problems.length) {
        for (const p of analysis.problems) rejections[p.split(":").at(-1)!] = (rejections[p.split(":").at(-1)!] ?? 0) + 1;
        continue;
      }
      return { challenge, analysis, fallbackStep: step, attempts, rejections };
    }
  }
  throw new Error("PokéCry: no valid day could be generated");
}
