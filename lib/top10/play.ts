import { isBaseSpecies, toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import { getTop10Filter } from "./filters";
import { DIRECTION_LABELS, getMetric } from "./metrics";
import {
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
  return { clues: typeClues(challenge, lookup), found: [], status: "playing" };
}

/**
 * Replays all guesses (stateless server) and evaluates the last one.
 * Enforces: valid unique base-species ids and no guesses after the game ended.
 * There are no lives: a wrong guess costs nothing.
 *
 * `gaveUpAt` (optional) = number of guesses made when the player used Give
 * Up: the game ends there, no later guess is accepted, and only then is the
 * full ranking revealed. A completed game cannot be given up.
 */
export function playTop10(challenge: Top10Challenge, guessIds: unknown, lookup: Lookup, gaveUpAt?: unknown): Top10Response {
  const givingUp = gaveUpAt !== undefined;
  if (!Array.isArray(guessIds) || !guessIds.every(Number.isInteger) || (guessIds.length === 0 && !givingUp)) {
    return { ok: false, message: "Petición no válida." };
  }
  if (givingUp && (!Number.isInteger(gaveUpAt) || (gaveUpAt as number) < 0 || (gaveUpAt as number) > guessIds.length)) {
    return { ok: false, message: "Petición no válida." };
  }
  if (new Set(guessIds).size !== guessIds.length) return { ok: false, message: "Ya lo has probado." };

  const positions = challenge.ranking.map((e) => e.id);
  const foundIdx: number[] = [];
  let result: "correct" | "wrong" | "gave-up" = "wrong";
  for (let i = 0; i < guessIds.length; i++) {
    if (foundIdx.length === TOP_SIZE || (givingUp && i >= (gaveUpAt as number))) {
      return { ok: false, message: "La partida ha terminado." };
    }
    const pokemon = lookup(guessIds[i]);
    if (!pokemon || !isBaseSpecies(pokemon)) return { ok: false, message: "Pokémon desconocido." };
    const index = positions.indexOf(pokemon.id);
    result = index >= 0 ? "correct" : "wrong";
    if (index >= 0) foundIdx.push(index);
  }
  if (givingUp) {
    if (foundIdx.length === TOP_SIZE) return { ok: false, message: "La partida ha terminado." };
    result = "gave-up";
  }

  const status = foundIdx.length === TOP_SIZE ? "won" : givingUp ? "gave-up" : "playing";
  const state: Top10PublicState = {
    clues: typeClues(challenge, lookup),
    found: foundIdx.map((i) => entry(challenge, i, lookup)).sort((a, b) => a.position - b.position),
    status,
    ranking: status === "playing" ? undefined : challenge.ranking.map((_, i) => entry(challenge, i, lookup)),
  };
  const lastIndex = positions.indexOf(guessIds[guessIds.length - 1]);
  return { ok: true, result, position: result === "correct" ? lastIndex + 1 : undefined, state };
}
