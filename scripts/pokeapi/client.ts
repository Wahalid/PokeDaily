/**
 * Minimal PokéAPI HTTP client used only by the sync script.
 * - Concurrency-limited to be polite to the public API.
 * - Retries transient failures.
 * - Caches raw responses on disk (.cache/pokeapi) so re-runs are fast and
 *   an interrupted sync can resume. Pass `--refresh` to bypass the cache.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const POKEAPI_BASE = "https://pokeapi.co/api/v2";

const CACHE_DIR = path.join(process.cwd(), ".cache", "pokeapi");
const MAX_CONCURRENCY = 12;
const MAX_RETRIES = 4;

export interface ClientOptions {
  refresh: boolean;
}

let active = 0;
const queue: Array<() => void> = [];

async function acquire(): Promise<void> {
  if (active < MAX_CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>((resolve) => queue.push(resolve));
  active++;
}

function release(): void {
  active--;
  queue.shift()?.();
}

function cachePath(url: string): string {
  const key = createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, `${key}.json`);
}

export function createClient(options: ClientOptions) {
  async function get<T>(urlOrPath: string): Promise<T> {
    const url = urlOrPath.startsWith("http") ? urlOrPath : `${POKEAPI_BASE}${urlOrPath}`;
    const file = cachePath(url);

    if (!options.refresh) {
      try {
        return JSON.parse(await readFile(file, "utf8")) as T;
      } catch {
        // cache miss
      }
    }

    await acquire();
    try {
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await fetch(url, { headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
          const json = (await res.json()) as T;
          await mkdir(CACHE_DIR, { recursive: true });
          await writeFile(file, JSON.stringify(json));
          return json;
        } catch (error) {
          if (attempt >= MAX_RETRIES) throw error;
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
      }
    } finally {
      release();
    }
  }

  return { get };
}

export type PokeApiClient = ReturnType<typeof createClient>;

/** Extracts the trailing numeric id from a PokéAPI resource URL. */
export function idFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  if (!match) throw new Error(`Cannot parse id from ${url}`);
  return Number(match[1]);
}

// ---- Raw PokéAPI response shapes (only the fields we use) ----

export interface NamedResource {
  name: string;
  url: string;
}

export interface RawList {
  count: number;
  results: NamedResource[];
}

export interface RawSpecies {
  id: number;
  name: string;
  names: Array<{ name: string; language: NamedResource }>;
  generation: NamedResource;
  is_legendary: boolean;
  is_mythical: boolean;
  is_baby: boolean;
  color: NamedResource;
  evolves_from_species: NamedResource | null;
  evolution_chain: { url: string };
  varieties: Array<{ is_default: boolean; pokemon: NamedResource }>;
}

export interface RawPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ slot: number; type: NamedResource }>;
  abilities: Array<{ is_hidden: boolean; slot: number; ability: NamedResource }>;
  stats: Array<{ base_stat: number; stat: NamedResource }>;
  sprites: {
    front_default: string | null;
    front_shiny: string | null;
    other?: { "official-artwork"?: { front_default: string | null } };
  };
}

export interface RawChainLink {
  species: NamedResource;
  evolves_to: RawChainLink[];
}

export interface RawEvolutionChain {
  id: number;
  chain: RawChainLink;
}
