/** Node-side loaders for scripts (the app uses lib/pokemon/repository.ts instead). */
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { GUESS_KEY_ENV, parseGuessKey } from "../../lib/guess/secret";
import type { ChallengeFile } from "../../lib/daily/challenge-store";
import { Pokedex } from "../../lib/pokemon/pokedex";
import { hashString } from "../../lib/random";
import type { PokemonDataset } from "../../lib/pokemon/types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const CHALLENGES_FILE = path.join(DATA_DIR, "daily-challenges.json");

export function loadPokedex(): Pokedex {
  const raw = readFileSync(path.join(DATA_DIR, "pokemon.json"), "utf8");
  return new Pokedex(JSON.parse(raw) as PokemonDataset);
}

/**
 * Content fingerprint of the Pokémon data (ignores `generatedAt`, so
 * re-syncing identical data keeps the same hash). Stored on frozen grids.
 */
export function datasetFingerprint(): { count: number; hash: string } {
  const dataset = JSON.parse(readFileSync(path.join(DATA_DIR, "pokemon.json"), "utf8")) as PokemonDataset;
  const hash = hashString(JSON.stringify(dataset.pokemon)).toString(16).padStart(8, "0");
  return { count: dataset.pokemon.length, hash };
}

/**
 * Secret key for "Adivina el Pokémon", read like Next.js does
 * (.env.local etc., never committed). Returns null if missing/invalid.
 */
export function loadGuessKey(): Buffer | null {
  loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });
  return parseGuessKey(process.env[GUESS_KEY_ENV]);
}

export function loadChallengeFile(): ChallengeFile {
  return JSON.parse(readFileSync(CHALLENGES_FILE, "utf8")) as ChallengeFile;
}
