import { isBaseSpecies } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import type { WordleEntry } from "./types";

/**
 * Names → PokéWordle words.
 *
 * normalizeName: lowercase, strip diacritics (é → e), and drop spaces, hyphens,
 * apostrophes (' and ’), dots, colons and the ♀/♂ symbols. Letters (and digits)
 * are never removed: "Farfetch’d" → "farfetchd", "Tapu Koko" → "tapukoko".
 */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s\-'’.:♀♂]/g, "");
}

/** Never the secret (they stay in pokemon.json and remain valid guesses when typeable). */
export const WORDLE_NOT_SECRET = new Set(["porygon2", "typenull"]);

/** Only plain a–z words can be typed on the A–Z keyboard (this leaves out Porygon2). */
const TYPEABLE = /^[a-z]+$/;

export interface WordleDictionary {
  /** Every typeable word → its entry (valid guesses). */
  byWord: Map<string, WordleEntry>;
  /** Entries that can be the daily secret. */
  secrets: WordleEntry[];
  /** Pokémon records by id (for weights and sprites). */
  byId: Map<number, Pokemon>;
}

/**
 * Base species only, merged by normalized name: Nidoran♀ and Nidoran♂ become a
 * single "Nidoran" entry (name without the gender symbol), so neither can be
 * picked on its own.
 */
export function buildWordleDictionary(pokemon: readonly Pokemon[]): WordleDictionary {
  const byWord = new Map<string, WordleEntry>();
  const byId = new Map<number, Pokemon>();
  for (const p of [...pokemon].filter(isBaseSpecies).sort((a, b) => a.id - b.id)) {
    byId.set(p.id, p);
    const word = normalizeName(p.name);
    if (!TYPEABLE.test(word)) continue;
    const existing = byWord.get(word);
    if (existing) {
      existing.ids.push(p.id);
      existing.name = p.name.replace(/[♀♂]/g, "").trim();
    } else {
      byWord.set(word, { word, name: p.name, ids: [p.id] });
    }
  }
  const secrets = [...byWord.values()].filter((e) => !WORDLE_NOT_SECRET.has(e.word));
  return { byWord, secrets, byId };
}
