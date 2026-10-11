import { TYPE_LABELS } from "./labels-es";
import { POKEMON_TYPES, type PokemonType } from "./types";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** Every accepted spelling → type: internal ids ("water"), English and Spanish names, any case or accents. */
const BY_NAME = new Map<string, PokemonType>(
  POKEMON_TYPES.flatMap((t) => [[t, t] as const, [strip(TYPE_LABELS[t]), t] as const]),
);

/** Resolves a type however it is written ("Water", "water", "Agua", "Eléctrico"); null when it isn't one. */
export function parsePokemonType(value: string | null | undefined): PokemonType | null {
  return value ? (BY_NAME.get(strip(value)) ?? null) : null;
}

/** The types behind a category id shared by several games ("type:fire", "dual:ghost+grass"); null for any other category. */
export function typesOfCategory(categoryId: string): PokemonType[] | null {
  const [family, rest = ""] = categoryId.split(":");
  if (family !== "type" && family !== "dual") return null;
  const types = rest.split("+").map(parsePokemonType);
  return types.length && types.every(Boolean) ? (types as PokemonType[]) : null;
}
