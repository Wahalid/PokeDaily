import type { GameId } from "@/lib/games/registry";

/**
 * Storage for daily challenges that have been "pinned" (archived).
 *
 * Generated challenges are deterministic for a given dataset. Pinning a
 * challenge freezes it so it stays identical even after the Pokémon data or
 * generator changes — this is how historical grids are preserved.
 *
 * V1 backend: data/daily-challenges.json (written by `npm run grid:preview -- --save`).
 * A database-backed store only needs to implement `ChallengeStore`.
 */

export interface StoredChallenge<T = unknown> {
  number: number;
  date: string;
  payload: T;
}

export type ChallengeFile = Partial<Record<GameId, Record<string, StoredChallenge>>>;

export interface ChallengeStore {
  get<T>(game: GameId, number: number): StoredChallenge<T> | null;
}

export function createJsonChallengeStore(file: ChallengeFile): ChallengeStore {
  return {
    get<T>(game: GameId, number: number) {
      return (file[game]?.[String(number)] as StoredChallenge<T> | undefined) ?? null;
    },
  };
}
