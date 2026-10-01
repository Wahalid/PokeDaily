/**
 * Curated classifications that PokéAPI does not expose directly.
 * Values are national dex numbers. Keep these lists the single source of
 * truth for the corresponding flags on our Pokémon model.
 */

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Full starter evolution lines (grass / fire / water) for every generation. */
export const STARTERS = new Set<number>([
  ...range(1, 9),
  ...range(152, 160),
  ...range(252, 260),
  ...range(387, 395),
  ...range(495, 503),
  ...range(650, 658),
  ...range(722, 730),
  ...range(810, 818),
  ...range(906, 914),
]);

/** Pokémon revived from fossils, plus their evolutions. */
export const FOSSILS = new Set<number>([
  ...range(138, 142), // Omanyte → Aerodactyl
  ...range(345, 348), // Lileep → Armaldo
  ...range(408, 411), // Cranidos → Bastiodon
  ...range(564, 567), // Tirtouga → Archeops
  ...range(696, 699), // Tyrunt → Aurorus
  ...range(880, 883), // Dracozolt → Arctovish
]);

/** Paradox Pokémon (ancient and future), including Koraidon and Miraidon. */
export const PARADOX = new Set<number>([
  ...range(984, 995),
  ...range(1005, 1010),
  ...range(1020, 1023),
]);

export const ULTRA_BEASTS = new Set<number>([...range(793, 799), ...range(803, 806)]);

export const REGION_BY_GENERATION = [
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

export const REGIONAL_FORM_PREFIX: Record<string, string> = {
  alola: "Alolan",
  galar: "Galarian",
  hisui: "Hisuian",
  paldea: "Paldean",
};
