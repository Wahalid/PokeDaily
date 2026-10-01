import type { PokemonSummary } from "./types";

/**
 * Fast local Pokémon search by name or Pokédex number.
 * Pure and client-safe: the index is built once, queries are O(n) over
 * ~1k pre-normalised entries (well under a millisecond).
 */

export interface PokemonSearchIndex {
  entries: Array<{ pokemon: PokemonSummary; key: string; words: string[] }>;
}

/** Lowercase, strip accents and punctuation: "Farfetch’d" → "farfetchd", "Mr. Mime" → "mr mime". */
export function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[♀]/g, " f")
    .replace(/[♂]/g, " m")
    .replace(/['’.:]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function buildSearchIndex(pokemon: PokemonSummary[]): PokemonSearchIndex {
  return {
    entries: pokemon.map((p) => {
      const normalized = normalizeName(p.name);
      return { pokemon: p, key: normalized.replace(/ /g, ""), words: normalized.split(" ") };
    }),
  };
}

export function searchPokemon(
  index: PokemonSearchIndex,
  rawQuery: string,
  limit = 8,
): PokemonSummary[] {
  const query = rawQuery.trim();
  if (!query) return [];

  // Pokédex number search: "25", "#025", "#0025"
  const numeric = query.replace(/^#/, "");
  if (/^\d+$/.test(numeric)) {
    const n = Number(numeric);
    const stripped = String(n);
    return index.entries
      .filter((e) => String(e.pokemon.dexNumber).startsWith(stripped))
      .sort((a, b) => {
        const aExact = a.pokemon.dexNumber === n ? 0 : 1;
        const bExact = b.pokemon.dexNumber === n ? 0 : 1;
        return aExact - bExact || a.pokemon.dexNumber - b.pokemon.dexNumber;
      })
      .slice(0, limit)
      .map((e) => e.pokemon);
  }

  const normalized = normalizeName(query);
  const compact = normalized.replace(/ /g, "");
  if (!compact) return [];

  const scored: Array<{ score: number; pokemon: PokemonSummary }> = [];
  for (const entry of index.entries) {
    let score: number;
    if (entry.key === compact) score = 0;
    else if (entry.key.startsWith(compact)) score = 1;
    else if (entry.words.some((w) => w.startsWith(normalized))) score = 2;
    else if (entry.key.includes(compact)) score = 3;
    else continue;
    scored.push({ score, pokemon: entry.pokemon });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.pokemon.dexNumber - b.pokemon.dexNumber)
    .slice(0, limit)
    .map((s) => s.pokemon);
}
