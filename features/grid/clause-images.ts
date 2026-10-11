/**
 * Grid condition id → its badge in public/pokemon_grid_clauses/ (576×128, 9:2,
 * like the type badges). Types are not listed: they use PokemonTypeBadge.
 * A condition without an entry keeps its text label.
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

export function clauseImageSrc(conditionId: string): string | null {
  const file = CLAUSE_IMAGES[conditionId];
  return file ? `/pokemon_grid_clauses/${file}` : null;
}
