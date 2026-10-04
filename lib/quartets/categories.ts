import { COLOR_LABELS, romanNumeral, TYPE_LABELS } from "@/lib/pokemon/labels-es";
import { POKEMON_COLORS, POKEMON_TYPES, type Pokemon, type PokemonType } from "@/lib/pokemon/types";

/**
 * Category catalogue for Cuartetos.
 *
 * A category is a predicate over our Pokémon model ("does this Pokémon belong?")
 * plus metadata the generator uses. Answers are never hard-coded: boards are
 * built by evaluating these predicates against data/pokemon.json.
 *
 * To add a category: add a factory call below. Categories that rely on
 * ambiguous or curated data must set `review: true` — the generator skips them
 * until they are reviewed (see GeneratorOptions.allowReviewCategories).
 */

export type CategoryFamily =
  | "type"
  | "dual-type"
  | "generation"
  | "classification"
  | "evolution"
  | "color"
  | "ability"
  | "measure";

export interface QuartetCategory {
  id: string;
  family: CategoryFamily;
  /** Spanish label shown once the group is solved. */
  label: string;
  /** Optional compact label for small cells (e.g. PokéBingo); falls back to `label`. */
  short?: string;
  /** How hard the underlying knowledge is: 0 obvious … 3 expert. */
  difficulty: 0 | 1 | 2 | 3;
  /** Needs human review before automatic use (ambiguous or curated data). */
  review?: boolean;
  test: (pokemon: Pokemon) => boolean;
}

const cat = (c: QuartetCategory) => c;

// ---- Types -------------------------------------------------------------------

const typeCategories = POKEMON_TYPES.map((type) =>
  cat({ id: `type:${type}`, family: "type", label: `Tipo ${TYPE_LABELS[type]}`, short: TYPE_LABELS[type], difficulty: 0, test: (p) => p.types.includes(type) }),
);

/** Exact dual-type combinations with enough species (measured on the dataset: 28 combos with ≥6). */
const DUAL_TYPES: Array<[PokemonType, PokemonType]> = [
  ["normal", "flying"], ["grass", "poison"], ["bug", "flying"], ["bug", "poison"], ["rock", "water"],
  ["ghost", "grass"], ["ground", "rock"], ["ground", "water"], ["ice", "water"], ["psychic", "fairy"],
  ["water", "flying"], ["steel", "psychic"], ["dark", "flying"], ["grass", "dark"], ["rock", "steel"],
  ["fire", "flying"], ["bug", "grass"], ["poison", "water"], ["psychic", "water"], ["dragon", "flying"],
  ["psychic", "flying"], ["grass", "flying"], ["normal", "psychic"], ["bug", "rock"], ["fire", "fighting"],
  ["steel", "fairy"], ["dragon", "ground"], ["fire", "ghost"],
];

const dualTypeCategories = DUAL_TYPES.map(([a, b]) =>
  cat({
    id: `dual:${[a, b].sort().join("+")}`,
    family: "dual-type",
    label: `Tipo ${TYPE_LABELS[a]} y ${TYPE_LABELS[b]}`,
    short: `${TYPE_LABELS[a]} / ${TYPE_LABELS[b]}`,
    difficulty: 2,
    test: (p) => p.types.length === 2 && p.types.includes(a) && p.types.includes(b),
  }),
);

// ---- Generation ----------------------------------------------------------------

const generationCategories = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) =>
  cat({
    id: `gen:${gen}`,
    family: "generation",
    label: `Generación ${romanNumeral(gen)}`,
    short: `Gen ${romanNumeral(gen)}`,
    difficulty: 1,
    test: (p) => p.generation === gen,
  }),
);

// ---- Classifications -----------------------------------------------------------

const classificationCategories: QuartetCategory[] = [
  cat({ id: "flag:starter", family: "classification", label: "Iniciales y sus evoluciones", short: "Iniciales", difficulty: 0, test: (p) => p.flags.isStarter }),
  cat({ id: "flag:legendary", family: "classification", label: "Legendarios", difficulty: 1, test: (p) => p.flags.isLegendary }),
  cat({ id: "flag:mythical", family: "classification", label: "Singulares (míticos)", short: "Singulares", difficulty: 2, test: (p) => p.flags.isMythical }),
  cat({ id: "flag:fossil", family: "classification", label: "Pokémon fósiles", short: "Fósiles", difficulty: 2, test: (p) => p.flags.isFossil }),
  cat({ id: "flag:baby", family: "classification", label: "Pokémon bebé", short: "Bebés", difficulty: 2, test: (p) => p.flags.isBaby }),
  cat({ id: "flag:paradox", family: "classification", label: "Pokémon paradoja", short: "Paradoja", difficulty: 3, test: (p) => p.flags.isParadox }),
  cat({ id: "flag:ultra-beast", family: "classification", label: "Ultraentes", difficulty: 3, test: (p) => p.flags.isUltraBeast }),
];

// ---- Evolution -----------------------------------------------------------------

const evolutionCategories: QuartetCategory[] = [
  cat({
    id: "evo:none",
    family: "evolution",
    label: "No evolucionan",
    short: "No evoluciona",
    difficulty: 2,
    test: (p) => !p.evolution.hasEvolutionFamily,
  }),
  cat({
    id: "evo:third",
    family: "evolution",
    label: "Tercera fase evolutiva",
    difficulty: 2,
    // Needs review: lines starting with a baby (Azurill → Marill → Azumarill)
    // count as 3 stages in the data, but most players consider them 2.
    review: true,
    test: (p) => p.evolution.hasEvolutionFamily && p.evolution.stage >= 3,
  }),
];

// ---- Official Pokédex colour (marked for review: perceived colour often differs) ----

const colorCategories = POKEMON_COLORS.map((color) =>
  cat({
    id: `color:${color}`,
    family: "color",
    label: `Color ${COLOR_LABELS[color].label.toLowerCase()} en la Pokédex`,
    difficulty: 3,
    review: true,
    test: (p) => p.color === color,
  }),
);

// ---- Abilities (regular abilities only; hidden abilities are excluded) -------------

const ABILITIES: Array<[slug: string, label: string]> = [
  ["levitate", "Levitación"],
  ["intimidate", "Intimidación"],
  ["swift-swim", "Nado Rápido"],
  ["chlorophyll", "Clorofila"],
  ["sturdy", "Robustez"],
  ["keen-eye", "Vista Lince"],
  ["static", "Elec. Estática"],
  ["flash-fire", "Absorbe Fuego"],
  ["synchronize", "Sincronía"],
  ["thick-fat", "Sebo"],
  ["pressure", "Presión"],
  ["swarm", "Enjambre"],
];

const abilityCategories = ABILITIES.map(([slug, label]) =>
  cat({
    id: `ability:${slug}`,
    family: "ability",
    label: `Habilidad ${label}`,
    short: label,
    difficulty: 3,
    test: (p) => p.abilities.some((a) => a.slug === slug && !a.isHidden),
  }),
);

// ---- Measures (base stats, weight, height) ---------------------------------------

const measureCategories: QuartetCategory[] = [
  cat({ id: "measure:speed>=120", family: "measure", label: "Velocidad base de 120 o más", short: "Velocidad ≥ 120", difficulty: 3, test: (p) => p.stats.speed >= 120 }),
  cat({ id: "measure:hp>=120", family: "measure", label: "PS base de 120 o más", short: "PS ≥ 120", difficulty: 3, test: (p) => p.stats.hp >= 120 }),
  cat({ id: "measure:heavy", family: "measure", label: "Pesan 200 kg o más", short: "≥ 200 kg", difficulty: 3, test: (p) => p.weight >= 2000 }),
  cat({ id: "measure:tall", family: "measure", label: "Miden 3 m o más", short: "≥ 3 m de alto", difficulty: 3, test: (p) => p.height >= 30 }),
  cat({ id: "measure:light", family: "measure", label: "Pesan 1 kg o menos", short: "≤ 1 kg", difficulty: 3, test: (p) => p.weight <= 10 }),
];

export const QUARTET_CATEGORIES: readonly QuartetCategory[] = [
  ...typeCategories,
  ...dualTypeCategories,
  ...generationCategories,
  ...classificationCategories,
  ...evolutionCategories,
  ...colorCategories,
  ...abilityCategories,
  ...measureCategories,
];

const byId = new Map(QUARTET_CATEGORIES.map((c) => [c.id, c]));
if (byId.size !== QUARTET_CATEGORIES.length) throw new Error("Duplicate Cuartetos category ids");

export function getQuartetCategory(id: string): QuartetCategory | undefined {
  return byId.get(id);
}
