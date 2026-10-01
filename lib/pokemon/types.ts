/**
 * PokeDaily Pokémon data model.
 *
 * This is OUR representation of Pokémon — produced by the sync script
 * (scripts/update-pokemon.ts) from PokéAPI and stored in data/pokemon.json.
 * Runtime code must only depend on these types, never on PokéAPI shapes.
 *
 * Extending the model: add an optional field here, populate it in
 * scripts/pokeapi/transform.ts, and re-run `npm run update:pokemon`.
 * Grid conditions read fields through plain predicates, so new attributes
 * never require changes to the Grid engine.
 */

export const POKEMON_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

export const REGIONS = [
  "kanto",
  "johto",
  "hoenn",
  "sinnoh",
  "unova",
  "kalos",
  "alola",
  "galar",
  "paldea",
] as const;

export type Region = (typeof REGIONS)[number];

export interface PokemonAbility {
  slug: string;
  name: string;
  isHidden: boolean;
}

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  total: number;
}

export type StatKey = keyof PokemonStats;

export interface PokemonSprites {
  /** Small front sprite (pixel art). Best for grids and lists. */
  default: string | null;
  shiny: string | null;
  /** Large official artwork. */
  artwork: string | null;
}

export interface PokemonEvolution {
  /** PokéAPI evolution chain id — Pokémon in the same family share it. */
  chainId: number;
  /** 1 = base stage, 2 = first evolution, 3 = second evolution. */
  stage: number;
  /** Dex number of the Pokémon this one evolves from. */
  evolvesFrom: number | null;
  /** Dex numbers of the Pokémon this one evolves into. */
  evolvesTo: number[];
  /** True when the Pokémon belongs to a family with more than one member. */
  hasEvolutionFamily: boolean;
}

export type PokemonFormKind = "mega" | "gigantamax" | "regional" | "other";

export interface PokemonForm {
  slug: string;
  name: string;
  kind: PokemonFormKind;
  types: PokemonType[];
  sprite: string | null;
}

export interface PokemonFlags {
  isLegendary: boolean;
  isMythical: boolean;
  isBaby: boolean;
  isStarter: boolean;
  isFossil: boolean;
  isParadox: boolean;
  isUltraBeast: boolean;
}

export interface Pokemon {
  /** Stable PokeDaily id. Equals the national dex number for species entries. */
  id: number;
  dexNumber: number;
  slug: string;
  name: string;
  generation: number;
  region: Region;
  types: PokemonType[];
  abilities: PokemonAbility[];
  stats: PokemonStats;
  /** Decimetres (PokéAPI unit). */
  height: number;
  /** Hectograms (PokéAPI unit). */
  weight: number;
  sprites: PokemonSprites;
  evolution: PokemonEvolution;
  flags: PokemonFlags;
  /** Alternate forms (megas, gigantamax, regional variants, ...). */
  forms: PokemonForm[];
}

export interface PokemonDataset {
  version: number;
  source: string;
  generatedAt: string;
  count: number;
  pokemon: Pokemon[];
}

/** Minimal shape needed by search results and answer display (client-safe). */
export interface PokemonSummary {
  id: number;
  dexNumber: number;
  name: string;
  sprite: string | null;
}
