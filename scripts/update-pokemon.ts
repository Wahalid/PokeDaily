/**
 * Synchronises the PokeDaily Pokémon database from PokéAPI.
 *
 *   npm run update:pokemon             # uses on-disk cache of raw responses
 *   npm run update:pokemon -- --refresh  # re-downloads everything
 *
 * Output: data/pokemon.json (committed; read by the app at runtime).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Pokemon, PokemonDataset, PokemonEvolution } from "../lib/pokemon/types";
import {
  createClient,
  idFromUrl,
  POKEAPI_BASE,
  type RawEvolutionChain,
  type RawList,
  type RawPokemon,
  type RawSpecies,
} from "./pokeapi/client";
import { indexEvolutionChain, toForm, toPokemon } from "./pokeapi/transform";

const OUTPUT = path.join(process.cwd(), "data", "pokemon.json");
const DATASET_VERSION = 1;

async function main() {
  const refresh = process.argv.includes("--refresh");
  const api = createClient({ refresh });
  const started = Date.now();

  console.log(`Fetching species list from ${POKEAPI_BASE} ${refresh ? "(refresh)" : "(cached)"}...`);
  const list = await api.get<RawList>("/pokemon-species?limit=5000");
  const speciesIds = list.results.map((r) => idFromUrl(r.url)).sort((a, b) => a - b);
  console.log(`→ ${speciesIds.length} species`);

  let done = 0;
  const progress = () => {
    done++;
    if (done % 100 === 0 || done === speciesIds.length) {
      console.log(`  ${done}/${speciesIds.length} species`);
    }
  };

  const species = await Promise.all(
    speciesIds.map(async (id) => {
      const s = await api.get<RawSpecies>(`/pokemon-species/${id}`);
      progress();
      return s;
    }),
  );

  console.log("Fetching evolution chains...");
  const chainUrls = [...new Set(species.map((s) => s.evolution_chain.url))];
  const evolutionByDex = new Map<number, PokemonEvolution>();
  const chains = await Promise.all(chainUrls.map((url) => api.get<RawEvolutionChain>(url)));
  for (const chain of chains) {
    for (const [dex, evo] of indexEvolutionChain(chain)) evolutionByDex.set(dex, evo);
  }
  console.log(`→ ${chains.length} chains`);

  console.log("Fetching Pokémon details and forms...");
  done = 0;
  const pokemon: Pokemon[] = await Promise.all(
    species.map(async (s) => {
      const defaultVariety = s.varieties.find((v) => v.is_default) ?? s.varieties[0];
      const [main, ...others] = await Promise.all([
        api.get<RawPokemon>(defaultVariety.pokemon.url),
        ...s.varieties
          .filter((v) => v !== defaultVariety)
          .map((v) => api.get<RawPokemon>(v.pokemon.url)),
      ]);
      progress();
      return toPokemon(s, main, evolutionByDex.get(s.id), others.map((o) => toForm(s, o)));
    }),
  );

  const dataset: PokemonDataset = {
    version: DATASET_VERSION,
    source: POKEAPI_BASE,
    generatedAt: new Date().toISOString(),
    count: pokemon.length,
    pokemon,
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, JSON.stringify(dataset));
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`✔ Wrote ${pokemon.length} Pokémon to ${path.relative(process.cwd(), OUTPUT)} in ${seconds}s`);
}

main().catch((error) => {
  console.error("✖ Pokémon sync failed:", error);
  process.exit(1);
});
