import type { PokemonSummary, PokemonType } from "@/lib/pokemon/types";

export const TOP_SIZE = 10;

export type Direction = "desc" | "asc";

/** One ranked entry (server-side; values are only revealed entry by entry). */
export interface RankedEntry {
  id: number;
  value: number;
}

/** Secret daily challenge: set + metric + direction and the frozen ranking. */
export interface Top10Challenge {
  filterId: string;
  metric: string;
  direction: Direction;
  ranking: RankedEntry[];
}

/** Client-safe description of the challenge (visible by design). */
export interface Top10Criterion {
  /** e.g. "Los Pokémon más pesados de la Generación I". */
  title: string;
  /** e.g. "Generación I — Peso" (used when sharing). */
  short: string;
  metricLabel: string;
  direction: Direction;
  /** e.g. "de mayor a menor". */
  directionLabel: string;
}

export interface FoundEntry {
  position: number;
  pokemon: PokemonSummary;
  /** Formatted metric value, e.g. "130" or "460 kg". */
  value: string;
}

/** "won": the whole ranking was found · "gave-up": the player used Give Up. There are no lives. */
export type Top10Status = "playing" | "won" | "gave-up";

/**
 * Client-safe state. Before a position is found the client only knows its
 * TYPE(S) — the deduction clue — never its name, number or value.
 */
export interface Top10PublicState {
  /** Type(s) of the Pokémon at each position (index 0 = #1). Both types for dual types. */
  clues: PokemonType[][];
  found: FoundEntry[];
  status: Top10Status;
  /** Present only when the game is over (completed or given up). */
  ranking?: FoundEntry[];
}

export type Top10Response =
  | { ok: true; result: "correct" | "wrong" | "gave-up"; position?: number; state: Top10PublicState }
  | { ok: false; message: string };
