import { POKEMON_TYPES, type Pokemon, type PokemonFlags, type PokemonFormKind, type StatKey } from "@/lib/pokemon/types";
import type { ConditionCategory, GridCondition } from "./types";

/**
 * The catalogue of all Grid conditions.
 *
 * To add a new condition: add a factory call below (or a new factory for a
 * new attribute). Nothing else in the engine, generator or UI needs to change.
 */

export const CONDITION_CATEGORIES: ConditionCategory[] = [
  { id: "type", label: "Type", weight: 5, allowOnBothAxes: true },
  { id: "generation", label: "Generation", weight: 3, allowOnBothAxes: false },
  { id: "classification", label: "Classification", weight: 1.2, allowOnBothAxes: false },
  { id: "evolution", label: "Evolution", weight: 1, allowOnBothAxes: false },
  { id: "typing", label: "Typing", weight: 0.5, allowOnBothAxes: false },
  { id: "forms", label: "Forms", weight: 0.8, allowOnBothAxes: false },
  { id: "stats", label: "Stats", weight: 1, allowOnBothAxes: false, knowledgeHeavy: true },
  { id: "physical", label: "Size", weight: 0.6, allowOnBothAxes: false, knowledgeHeavy: true },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- Factories ----

function typeCondition(type: (typeof POKEMON_TYPES)[number]): GridCondition {
  return {
    id: `type:${type}`,
    category: "type",
    label: capitalize(type),
    description: `${capitalize(type)}-type Pokémon`,
    meta: { pokemonType: type },
    test: (p) => p.types.includes(type),
  };
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

function generationCondition(gen: number): GridCondition {
  return {
    id: `gen:${gen}`,
    category: "generation",
    label: `Gen ${ROMAN[gen - 1] ?? gen}`,
    description: `Introduced in Generation ${gen}`,
    meta: { generation: gen },
    test: (p) => p.generation === gen,
  };
}

function flagCondition(id: string, flag: keyof PokemonFlags, label: string, description: string): GridCondition {
  return { id: `flag:${id}`, category: "classification", label, description, test: (p) => p.flags[flag] };
}

function formCondition(kind: PokemonFormKind, label: string, description: string): GridCondition {
  return {
    id: `form:${kind}`,
    category: "forms",
    label,
    description,
    test: (p) => p.forms.some((f) => f.kind === kind),
  };
}

function statAtLeast(stat: StatKey, value: number, label: string, statName: string): GridCondition {
  return {
    id: `stat:${stat}>=${value}`,
    category: "stats",
    label,
    description: `${statName} of ${value} or more`,
    test: (p) => p.stats[stat] >= value,
  };
}

function custom(
  id: string,
  category: GridCondition["category"],
  label: string,
  description: string,
  test: (p: Pokemon) => boolean,
): GridCondition {
  return { id, category, label, description, test };
}

// ---- Catalogue ----

export const CONDITIONS: GridCondition[] = [
  ...POKEMON_TYPES.map(typeCondition),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(generationCondition),

  flagCondition("legendary", "isLegendary", "Legendary", "Legendary Pokémon"),
  flagCondition("mythical", "isMythical", "Mythical", "Mythical Pokémon"),
  flagCondition("starter", "isStarter", "Starter", "A starter Pokémon or its evolutions"),
  flagCondition("fossil", "isFossil", "Fossil", "Revived from a fossil (or its evolutions)"),
  flagCondition("paradox", "isParadox", "Paradox", "Paradox Pokémon"),
  flagCondition("ultra-beast", "isUltraBeast", "Ultra Beast", "Ultra Beasts"),

  custom("evo:first-stage", "evolution", "First Stage", "Unevolved Pokémon that can evolve",
    (p) => p.evolution.stage === 1 && p.evolution.evolvesTo.length > 0),
  custom("evo:final-stage", "evolution", "Final Evolution", "Fully evolved member of an evolution line",
    (p) => p.evolution.hasEvolutionFamily && p.evolution.evolvesTo.length === 0),
  custom("evo:none", "evolution", "No Evolution", "Does not evolve at all",
    (p) => !p.evolution.hasEvolutionFamily),

  custom("typing:mono", "typing", "Single Type", "Has exactly one type", (p) => p.types.length === 1),
  custom("typing:dual", "typing", "Dual Type", "Has two types", (p) => p.types.length === 2),

  formCondition("mega", "Has Mega", "Has a Mega Evolution"),
  formCondition("gigantamax", "Has Gigantamax", "Has a Gigantamax form"),
  formCondition("regional", "Regional Form", "Has a regional variant"),

  statAtLeast("total", 500, "BST 500+", "Base stat total"),
  statAtLeast("speed", 100, "Speed 100+", "Base Speed"),
  statAtLeast("attack", 120, "Attack 120+", "Base Attack"),
  statAtLeast("hp", 100, "HP 100+", "Base HP"),

  custom("size:heavy", "physical", "Heavy", "Weighs 100 kg or more", (p) => p.weight >= 1000),
  custom("size:tall", "physical", "Tall", "2 m tall or more", (p) => p.height >= 20),
  custom("size:small", "physical", "Tiny", "0.5 m tall or less", (p) => p.height <= 5),
];
