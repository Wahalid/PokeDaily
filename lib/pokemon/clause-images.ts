/**
 * Condition id → its badge in public/pokemon_grid_clauses/ (576×128, 9:2,
 * like the type badges). Keyed by Pokémon Grid condition ids; PokéBingo,
 * Pokémon Groups and PokéImpostor share the same ids for the same rules
 * (gen:3, flag:legendary, evo:none…). Types are not listed: they use
 * PokemonTypeBadge. A condition without an entry keeps its text label.
 */
export const CLAUSE_IMAGES: Readonly<Record<string, string>> = {
  "gen:1": "gen_i.png",
  "gen:2": "gen_ii.png",
  "gen:3": "gen_iii.png",
  "gen:4": "gen_iv.png",
  "gen:5": "gen_v.png",
  "gen:6": "gen_vi.png",
  "gen:7": "gen_vii.png",
  "gen:8": "gen_viii.png",
  "gen:9": "gen_ix.png",

  "flag:legendary": "legendary.png",
  "flag:mythical": "mythical.png",
  "flag:starter": "starter.png",
  "flag:fossil": "fossil.png",
  "flag:paradox": "paradox.png",
  "flag:ultra-beast": "ultra_beast.png",
  "flag:baby": "baby_pokemon.png",
  "flag:pseudo-legendary": "pseudo_legendary.png",

  "gender:genderless": "genderless.png",

  "evo:first-stage": "first_stage.png",
  "evo:final-stage": "final_evolution.png",
  "evo:none": "no_evolution.png",
  "evo:three-stage": "three_stage_line.png",

  "typing:mono": "single_type.png",
  "typing:dual": "dual_type.png",

  "form:mega": "has_mega.png",
  "form:gigantamax": "has_gigantamax.png",
  "form:regional": "regional_form.png",

  "stat:total>=500": "bst_500.png",
  "stat:total>=600": "bst_600.png",
  "stat:speed>=100": "speed_100.png",
  "stat:attack>=120": "attack_120.png",
  "stat:hp>=100": "hp_100.png",

  "size:heavy": "heavy.png",
  "size:tall": "tall.png",
  "size:small": "tiny.png",
};

/**
 * Other games' ids for exactly the same rule as a Grid condition (verified
 * Pokémon by Pokémon in `npm run verify`). Look-alikes with other thresholds
 * (Velocidad ≥ 120, ≥ 200 kg, ≥ 3 m…) are deliberately absent: no badge says 100+ for 120+.
 */
export const CLAUSE_ALIASES: Readonly<Record<string, string>> = {
  "types:two": "typing:dual", // PokéImpostor «Dos tipos»
  "total:600": "stat:total>=600", // PokéImpostor «Total ≥ 600»
};

export function clauseImageSrc(conditionId: string): string | null {
  const file = CLAUSE_IMAGES[CLAUSE_ALIASES[conditionId] ?? conditionId];
  return file ? `/pokemon_grid_clauses/${file}` : null;
}
