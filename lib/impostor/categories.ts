import { romanNumeral, TYPE_LABELS } from "@/lib/pokemon/labels-es";
import type { Pokemon, PokemonType } from "@/lib/pokemon/types";
import { getQuartetCategory, QUARTET_CATEGORIES, type CategoryFamily } from "@/lib/quartets/categories";

/**
 * PokéImpostor categories: the shared Cuartetos catalogue (same predicates over
 * data/pokemon.json) plus a few extras, each with a player-facing title that
 * states the exact data semantics.
 *
 * - `ambiguous`: Pokémon whose membership players could reasonably dispute
 *   (e.g. only a regional form evolves). They never appear on that board.
 * - `nearMiss`: how tempting a NON-member is as an impostor (0 none … ~3 devious),
 *   from data only (forms with the type, chain relatives, near-threshold values…).
 * - `trick`: how non-obvious a member is (0 … ~2).
 *
 * Left out on purpose: Pokédex colours and "third stage" (marked for review in
 * Cuartetos), paradox Pokémon and Ultra Beasts (almost no recognizable members).
 */

export type ImpostorFamily = CategoryFamily | "two-types" | "can-evolve" | "total";

export interface ImpostorCategory {
  id: string;
  family: ImpostorFamily;
  title: string;
  short: string;
  /** Extra rule shown under the title, when the semantics need it. */
  note?: string;
  /** Knowledge needed: 0 obvious … 3 expert. */
  difficulty: 0 | 1 | 2 | 3;
  test: (p: Pokemon) => boolean;
  ambiguous?: (p: Pokemon) => boolean;
  nearMiss?: (p: Pokemon, ctx: CategoryContext) => number;
  trick?: (p: Pokemon, ctx: CategoryContext) => number;
}

export interface CategoryContext {
  /** Pokémon ids sharing an evolution chain, by chain id. */
  chains: Map<number, Pokemon[]>;
}

const BASE_ONLY = "Solo cuenta la forma normal (sin megaevoluciones ni formas regionales).";

/** Only a regional / variant form evolves (or is the evolution): debatable for evolution categories. */
const REGIONAL_ONLY_EVOLUTION = new Set([
  "farfetchd", "sirfetchd", "corsola", "cursola", "qwilfish", "overqwil", "basculin", "basculegion",
  "linoone", "obstagoon", "mr-mime", "mr-rime",
]);
const evolutionAmbiguous = (p: Pokemon) => REGIONAL_ONLY_EVOLUTION.has(p.slug);

/** Starters only in Let's Go Pikachu / Eevee: players could argue either way. */
const STARTER_AMBIGUOUS = new Set(["pichu", "pikachu", "raichu", "eevee"]);

const relatives = (p: Pokemon, ctx: CategoryContext) => (ctx.chains.get(p.evolution.chainId) ?? []).filter((r) => r.id !== p.id);
const formHas = (p: Pokemon, test: (types: readonly string[]) => boolean) => p.forms.some((f) => test(f.types));
/** 1 when `value` sits right at the threshold, fading to 0 at `range` away. */
const closeness = (value: number, threshold: number, range: number) => Math.max(0, 1 - Math.abs(value - threshold) / range);

function fromCatalog(id: string, extra: Omit<ImpostorCategory, "id" | "family" | "difficulty" | "test"> & { difficulty?: ImpostorCategory["difficulty"] }): ImpostorCategory {
  const base = getQuartetCategory(id);
  if (!base || base.review) throw new Error(`Category ${id} is not usable`);
  return { id, family: base.family, difficulty: base.difficulty, test: base.test, ...extra };
}

// ---- Types ---------------------------------------------------------------------

const typeCategories = QUARTET_CATEGORIES.filter((c) => c.family === "type").map((c) => {
  const type = c.id.slice("type:".length) as PokemonType;
  return fromCatalog(c.id, {
    title: `Pokémon de tipo ${TYPE_LABELS[type]}`,
    short: `Tipo ${TYPE_LABELS[type]}`,
    note: `Cuenta cualquiera de sus tipos. ${BASE_ONLY}`,
    // A mega / regional form with the type (Charizard → Mega Charizard X is Dragon).
    nearMiss: (p) => (formHas(p, (t) => t.includes(type)) ? 2.5 : 0),
    trick: (p, ctx) => (p.types[0] !== type ? 1 : 0) + (relatives(p, ctx).some((r) => !r.types.includes(type)) ? 1 : 0),
  });
});

const dualCategories = QUARTET_CATEGORIES.filter((c) => c.family === "dual-type").map((c) => {
  const [a, b] = c.id.slice("dual:".length).split("+") as [PokemonType, PokemonType];
  return fromCatalog(c.id, {
    title: `Pokémon de tipo ${TYPE_LABELS[a]} y ${TYPE_LABELS[b]}`,
    short: `${TYPE_LABELS[a]} / ${TYPE_LABELS[b]}`,
    note: `Exactamente esos dos tipos. ${BASE_ONLY}`,
    nearMiss: (p) =>
      (p.types.includes(a) !== p.types.includes(b) ? 1.5 : 0) + (formHas(p, (t) => t.includes(a) && t.includes(b)) ? 1.5 : 0),
  });
});

// ---- Generations -----------------------------------------------------------------

const generationCategories = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((gen) =>
  fromCatalog(`gen:${gen}`, {
    title: `Pokémon de la Generación ${romanNumeral(gen)}`,
    short: `Gen ${romanNumeral(gen)}`,
    note: "Según la generación en la que debutó la especie.",
    // Pre-evolutions / evolutions added in another generation (Pichu, Crobat, Magmortar…).
    nearMiss: (p, ctx) => (relatives(p, ctx).some((r) => r.generation === gen) ? 1.5 : 0) + (Math.abs(p.generation - gen) === 1 ? 0.5 : 0),
    trick: (p, ctx) => (relatives(p, ctx).some((r) => r.generation !== gen) ? 1 : 0),
  }),
);

// ---- Classifications ---------------------------------------------------------------

const STARTER_TYPES: PokemonType[] = ["grass", "fire", "water"];

const classificationCategories: ImpostorCategory[] = [
  fromCatalog("flag:starter", {
    title: "Pokémon iniciales (o sus evoluciones)",
    short: "Iniciales",
    note: "Los tres iniciales de cada región y sus evoluciones.",
    ambiguous: (p) => STARTER_AMBIGUOUS.has(p.slug),
    // Grass / fire / water lines that look like starters (Oddish, Growlithe, Poliwag lines…).
    nearMiss: (p, ctx) =>
      (p.types.some((t) => STARTER_TYPES.includes(t)) ? 1 : 0) +
      ((ctx.chains.get(p.evolution.chainId)?.length ?? 1) >= 3 ? 1.5 : 0),
  }),
  fromCatalog("flag:legendary", {
    title: "Pokémon legendarios",
    short: "Legendarios",
    note: "Los singulares (míticos), ultraentes y paradojas no cuentan.",
    nearMiss: (p) =>
      p.flags.isMythical ? 3 : p.flags.isUltraBeast || p.flags.isParadox ? 2 : p.stats.total >= 570 ? 1.5 : 0,
  }),
  fromCatalog("flag:mythical", {
    title: "Pokémon singulares (míticos)",
    short: "Singulares",
    note: "Los legendarios no cuentan.",
    nearMiss: (p) => (p.flags.isLegendary ? 3 : p.flags.isUltraBeast ? 1.5 : 0),
  }),
  fromCatalog("flag:fossil", {
    title: "Pokémon fósiles (o sus evoluciones)",
    short: "Fósiles",
    nearMiss: (p) => (p.types.includes("rock") ? 1.5 : 0) + (p.flags.isParadox && p.stats.total < 600 ? 1 : 0),
  }),
  fromCatalog("flag:baby", {
    title: "Pokémon bebé",
    short: "Bebés",
    note: "Los clasificados oficialmente como bebé.",
    nearMiss: (p) => (p.evolution.stage === 1 && p.evolution.evolvesTo.length > 0 && p.stats.total <= 330 ? 2.5 : 0),
  }),
];

// ---- Evolution -----------------------------------------------------------------------

const evolutionCategories: ImpostorCategory[] = [
  fromCatalog("evo:none", {
    title: "Pokémon sin familia evolutiva",
    short: "Sin evolución",
    note: "Ni evolucionan ni proceden de otro Pokémon.",
    ambiguous: evolutionAmbiguous,
    // Look like loners but have a (sometimes later) relative: Dunsparce, Cosmog, Kubfu…
    nearMiss: (p, ctx) =>
      (relatives(p, ctx).length === 1 ? 1.5 : 0) + (relatives(p, ctx).some((r) => r.generation > p.generation) ? 1.5 : 0),
  }),
  {
    id: "evo:can-evolve",
    family: "can-evolve",
    title: "Pokémon que pueden evolucionar",
    short: "Pueden evolucionar",
    note: "Tienen al menos una evolución posterior.",
    difficulty: 1,
    test: (p) => p.evolution.evolvesTo.length > 0,
    ambiguous: evolutionAmbiguous,
    nearMiss: (p, ctx) => (p.evolution.evolvesFrom !== null && relatives(p, ctx).length === 1 ? 1.5 : p.evolution.evolvesFrom !== null ? 1 : 0),
    // Evolutions added in later generations (Dunsparce, Ursaring, Primeape…).
    trick: (p, ctx) => (relatives(p, ctx).some((r) => p.evolution.evolvesTo.includes(r.id) && r.generation > p.generation) ? 2 : 0),
  },
];

// ---- Two types ---------------------------------------------------------------------

const twoTypes: ImpostorCategory = {
  id: "types:two",
  family: "two-types",
  title: "Pokémon con dos tipos",
  short: "Dos tipos",
  note: BASE_ONLY,
  difficulty: 1,
  test: (p) => p.types.length === 2,
  // Mono-type Pokémon from dual-type lines (Charmander, Dratini…) or with dual-type forms.
  nearMiss: (p, ctx) => (relatives(p, ctx).some((r) => r.types.length === 2) ? 2 : 0) + (formHas(p, (t) => t.length === 2) ? 1.5 : 0),
  trick: (p, ctx) => (relatives(p, ctx).some((r) => r.types.length === 1) ? 1 : 0),
};

// ---- Abilities (regular abilities; hidden-ability holders are left out as debatable) ----

const abilityCategories = QUARTET_CATEGORIES.filter((c) => c.family === "ability").map((c) => {
  const slug = c.id.slice("ability:".length);
  const label = c.short ?? c.label;
  return fromCatalog(c.id, {
    title: `Pokémon con la habilidad ${label}`,
    short: label,
    note: "Como habilidad normal (no oculta).",
    ambiguous: (p) => p.abilities.some((a) => a.slug === slug && a.isHidden) && !c.test(p),
  });
});

// ---- Measures (exact base values from the dataset) ---------------------------------------

const measureCategories: ImpostorCategory[] = [
  fromCatalog("measure:speed>=120", {
    title: "Pokémon con Velocidad base de 120 o más",
    short: "Velocidad ≥ 120",
    nearMiss: (p) => 3 * closeness(p.stats.speed, 119, 25),
    trick: (p) => 2 * closeness(p.stats.speed, 120, 15),
  }),
  fromCatalog("measure:hp>=120", {
    title: "Pokémon con PS base de 120 o más",
    short: "PS ≥ 120",
    nearMiss: (p) => 3 * closeness(p.stats.hp, 119, 25),
    trick: (p) => 2 * closeness(p.stats.hp, 120, 15),
  }),
  fromCatalog("measure:heavy", {
    title: "Pokémon que pesan 200 kg o más",
    short: "≥ 200 kg",
    nearMiss: (p) => 3 * closeness(p.weight, 1999, 700),
    trick: (p) => 2 * closeness(p.weight, 2000, 500),
  }),
  fromCatalog("measure:tall", {
    title: "Pokémon que miden 3 m o más",
    short: "≥ 3 m",
    nearMiss: (p) => 3 * closeness(p.height, 29, 10),
    trick: (p) => 2 * closeness(p.height, 30, 6),
  }),
  {
    id: "total:600",
    family: "total",
    title: "Pokémon con 600 o más de estadísticas base totales",
    short: "Total ≥ 600",
    difficulty: 3,
    test: (p) => p.stats.total >= 600,
    nearMiss: (p) => 3 * closeness(p.stats.total, 599, 80),
    trick: (p) => (!p.flags.isLegendary && !p.flags.isMythical ? 1 : 0),
  },
];

export const IMPOSTOR_CATEGORIES: readonly ImpostorCategory[] = [
  ...typeCategories,
  ...dualCategories,
  ...generationCategories,
  ...classificationCategories,
  ...evolutionCategories,
  twoTypes,
  ...abilityCategories,
  ...measureCategories,
];

const byId = new Map(IMPOSTOR_CATEGORIES.map((c) => [c.id, c]));
if (byId.size !== IMPOSTOR_CATEGORIES.length) throw new Error("Duplicate PokéImpostor category ids");

export function getImpostorCategory(id: string): ImpostorCategory | undefined {
  return byId.get(id);
}
