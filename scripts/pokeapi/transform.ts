/**
 * Converts raw PokéAPI responses into the PokeDaily Pokémon model.
 * This is the only place that knows about both shapes.
 */
import type {
  Pokemon,
  PokemonEvolution,
  PokemonForm,
  PokemonFormKind,
  PokemonStats,
  PokemonType,
  Region,
} from "../../lib/pokemon/types";
import { POKEMON_TYPES } from "../../lib/pokemon/types";
import {
  idFromUrl,
  type RawChainLink,
  type RawEvolutionChain,
  type RawPokemon,
  type RawSpecies,
} from "./client";
import {
  FOSSILS,
  PARADOX,
  REGION_BY_GENERATION,
  REGIONAL_FORM_PREFIX,
  STARTERS,
  ULTRA_BEASTS,
} from "./curated";

const ROMAN: Record<string, number> = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
};

export function parseGeneration(name: string): number {
  const roman = name.replace("generation-", "");
  const gen = ROMAN[roman];
  if (!gen) throw new Error(`Unknown generation "${name}"`);
  return gen;
}

export function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function englishName(species: RawSpecies): string {
  return species.names.find((n) => n.language.name === "en")?.name ?? titleCase(species.name);
}

function toTypes(raw: RawPokemon): PokemonType[] {
  return [...raw.types]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name)
    .filter((t): t is PokemonType => (POKEMON_TYPES as readonly string[]).includes(t));
}

function toStats(raw: RawPokemon): PokemonStats {
  const get = (name: string) => raw.stats.find((s) => s.stat.name === name)?.base_stat ?? 0;
  const stats = {
    hp: get("hp"),
    attack: get("attack"),
    defense: get("defense"),
    specialAttack: get("special-attack"),
    specialDefense: get("special-defense"),
    speed: get("speed"),
  };
  return { ...stats, total: Object.values(stats).reduce((a, b) => a + b, 0) };
}

// ---- Evolution chains ----

/** Flattens an evolution chain into per-species evolution info, keyed by dex number. */
export function indexEvolutionChain(chain: RawEvolutionChain): Map<number, PokemonEvolution> {
  const result = new Map<number, PokemonEvolution>();
  let familySize = 0;

  const walk = (link: RawChainLink, stage: number, parent: number | null) => {
    const id = idFromUrl(link.species.url);
    familySize++;
    result.set(id, {
      chainId: chain.id,
      stage,
      evolvesFrom: parent,
      evolvesTo: link.evolves_to.map((child) => idFromUrl(child.species.url)),
      hasEvolutionFamily: false,
    });
    link.evolves_to.forEach((child) => walk(child, stage + 1, id));
  };
  walk(chain.chain, 1, null);

  for (const evo of result.values()) evo.hasEvolutionFamily = familySize > 1;
  return result;
}

// ---- Forms ----

function classifyForm(suffix: string): PokemonFormKind {
  if (/(^|-)mega($|-)/.test(suffix)) return "mega";
  if (/(^|-)gmax$/.test(suffix)) return "gigantamax";
  const parts = suffix.split("-");
  // "pikachu-alola-cap" is Ash's cap, not a regional variant.
  if (!parts.includes("cap") && Object.keys(REGIONAL_FORM_PREFIX).some((r) => parts.includes(r))) {
    return "regional";
  }
  return "other";
}

function formName(baseName: string, suffix: string, kind: PokemonFormKind): string {
  switch (kind) {
    case "mega": {
      const rest = suffix.replace(/(^|-)mega($|-)/, "$1$2").replace(/^-|-$/g, "");
      return `Mega ${baseName}${rest ? ` ${rest.toUpperCase()}` : ""}`;
    }
    case "gigantamax":
      return `Gigantamax ${baseName}`;
    case "regional": {
      const parts = suffix.split("-");
      const region = parts.find((p) => p in REGIONAL_FORM_PREFIX)!;
      const rest = parts.filter((p) => p !== region).join("-");
      return `${REGIONAL_FORM_PREFIX[region]} ${baseName}${rest ? ` (${titleCase(rest)})` : ""}`;
    }
    default:
      return `${baseName} (${titleCase(suffix)})`;
  }
}

export function toForm(species: RawSpecies, raw: RawPokemon): PokemonForm {
  const baseName = englishName(species);
  const suffix = raw.name.startsWith(`${species.name}-`)
    ? raw.name.slice(species.name.length + 1)
    : raw.name;
  const kind = classifyForm(suffix);
  return {
    slug: raw.name,
    name: formName(baseName, suffix, kind),
    kind,
    types: toTypes(raw),
    sprite: raw.sprites.front_default,
  };
}

// ---- Species ----

export function toPokemon(
  species: RawSpecies,
  raw: RawPokemon,
  evolution: PokemonEvolution | undefined,
  forms: PokemonForm[],
): Pokemon {
  const generation = parseGeneration(species.generation.name);
  const dex = species.id;
  return {
    id: dex,
    dexNumber: dex,
    slug: species.name,
    name: englishName(species),
    generation,
    region: REGION_BY_GENERATION[generation - 1] as Region,
    types: toTypes(raw),
    abilities: [...raw.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ slug: a.ability.name, name: titleCase(a.ability.name), isHidden: a.is_hidden })),
    stats: toStats(raw),
    height: raw.height,
    weight: raw.weight,
    sprites: {
      default: raw.sprites.front_default,
      shiny: raw.sprites.front_shiny,
      artwork: raw.sprites.other?.["official-artwork"]?.front_default ?? null,
    },
    evolution: evolution ?? {
      chainId: 0,
      stage: 1,
      evolvesFrom: null,
      evolvesTo: [],
      hasEvolutionFamily: false,
    },
    flags: {
      isLegendary: species.is_legendary,
      isMythical: species.is_mythical,
      isBaby: species.is_baby,
      isStarter: STARTERS.has(dex),
      isFossil: FOSSILS.has(dex),
      isParadox: PARADOX.has(dex),
      isUltraBeast: ULTRA_BEASTS.has(dex),
    },
    forms,
  };
}
