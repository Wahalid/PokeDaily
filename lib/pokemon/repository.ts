import "server-only";

import dataset from "@/data/pokemon.json";
import { Pokedex } from "./pokedex";
import type { PokemonDataset } from "./types";

/**
 * Server-side access point to the PokeDaily Pokémon database.
 *
 * Today the database is a JSON snapshot bundled with the server
 * (data/pokemon.json, produced by `npm run update:pokemon`). If we move to
 * SQLite/Postgres later, only this module needs to change.
 */
let pokedex: Pokedex | null = null;

export function getPokedex(): Pokedex {
  pokedex ??= new Pokedex(dataset as unknown as PokemonDataset);
  return pokedex;
}
