import { isBaseSpecies, toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getTop10Filter } from "./filters";
import { DIRECTION_LABELS, getMetric } from "./metrics";
import {
  MAX_LIVES,
  TOP_SIZE,
  type FoundEntry,
  type Top10Challenge,
  type Top10Criterion,
  type Top10PublicState,
  type Top10Response,
} from "./types";

type Lookup = (id: number) => Pokemon | undefined;

/** The visible criterion (by design the player sees the set, the metric and the direction). */
export function criterionView(challenge: Top10Challenge): Top10Criterion {
  const filter = getTop10Filter(challenge.filterId);
  const metric = getMetric(challenge.metric);
  const phrase = metric?.directions[challenge.direction]?.phrase ?? metric?.label ?? challenge.metric;
  return {
    title: filter ? filter.title(phrase) : `${challenge.filterId} · ${phrase}`,
    short: `${filter?.short ?? challenge.filterId} — ${metric?.label ?? challenge.metric}`,
    metricLabel: metric?.label ?? challenge.metric,
    direction: challenge.direction,
    directionLabel: DIRECTION_LABELS[challenge.direction],
  };
}

/** Type clue per position (both types for dual-type Pokémon). Never names, numbers or values. */
export function typeClues(challenge: Top10Challenge, lookup: Lookup) {
  return challenge.ranking.map((e) => [...(lookup(e.id)?.types ?? [])]);
}

function entry(challenge: Top10Challenge, index: number, lookup: Lookup): FoundEntry {
  const { id, value } = challenge.ranking[index];
  const metric = getMetric(challenge.metric);
  return { position: index + 1, pokemon: toSummary(lookup(id)!), value: metric ? metric.format(value) : String(value) };
}

/** Initial client state: the type clues and nothing else. */
export function initialTop10State(challenge: Top10Challenge, lookup: Lookup): Top10PublicState {
  return { clues: typeClues(challenge, lookup), found: [], lives: MAX_LIVES, status: "playing" };
}

/**
 * Replays all guesses (stateless server) and evaluates the last one.
 * Enforces: valid unique base-species ids, no guesses after the game ended,
 * 3 lives. Only found entries are returned — plus the full ranking once the
 * game is over.
 */
export function playTop10(challenge: Top10Challenge, guessIds: unknown, lookup: Lookup): Top10Response {
  if (!Array.isArray(guessIds) || guessIds.length === 0 || !guessIds.every(Number.isInteger)) {
    return { ok: false, message: "Petición no válida." };
  }
  if (new Set(guessIds).size !== guessIds.length) return { ok: false, message: "Ya lo has probado." };

  const positions = challenge.ranking.map((e) => e.id);
  let lives = MAX_LIVES;
  const foundIdx: number[] = [];
  let result: "correct" | "wrong" = "wrong";
  for (let i = 0; i < guessIds.length; i++) {
    if (lives <= 0 || foundIdx.length === TOP_SIZE) return { ok: false, message: "La partida ha terminado." };
    const pokemon = lookup(guessIds[i]);
    if (!pokemon || !isBaseSpecies(pokemon)) return { ok: false, message: "Pokémon desconocido." };
    const index = positions.indexOf(pokemon.id);
    result = index >= 0 ? "correct" : "wrong";
    if (index >= 0) foundIdx.push(index);
    else lives--;
  }

  const status = foundIdx.length === TOP_SIZE ? "won" : lives <= 0 ? "lost" : "playing";
  const state: Top10PublicState = {
    clues: typeClues(challenge, lookup),
    found: foundIdx.map((i) => entry(challenge, i, lookup)).sort((a, b) => a.position - b.position),
    lives,
    status,
    ranking: status === "playing" ? undefined : challenge.ranking.map((_, i) => entry(challenge, i, lookup)),
  };
  const lastIndex = positions.indexOf(guessIds[guessIds.length - 1]);
  return { ok: true, result, position: result === "correct" ? lastIndex + 1 : undefined, state };
}
