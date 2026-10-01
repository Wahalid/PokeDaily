import { buildSearchIndex, type PokemonSearchIndex } from "@/lib/pokemon/search";
import type { PokemonSummary } from "@/lib/pokemon/types";

export const SEARCH_INDEX_URL = "/api/pokemon/search-index";

let promise: Promise<PokemonSearchIndex> | null = null;

/** Loads the Pokémon search index once per page session (shared by all games). */
export function loadSearchIndex(): Promise<PokemonSearchIndex> {
  promise ??= fetch(SEARCH_INDEX_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Search index failed: ${res.status}`);
      return res.json() as Promise<PokemonSummary[]>;
    })
    .then(buildSearchIndex)
    .catch((error) => {
      promise = null; // allow retry
      throw error;
    });
  return promise;
}
