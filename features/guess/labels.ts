import type { EvolutionPhase } from "@/lib/guess/types";
import type { PokemonColor, PokemonType } from "@/lib/pokemon/types";

/** Spanish presentation labels for "Adivina el Pokémon" (UI only). */

export const TYPE_LABELS: Record<PokemonType, string> = {
  normal: "Normal",
  fire: "Fuego",
  water: "Agua",
  electric: "Eléctrico",
  grass: "Planta",
  ice: "Hielo",
  fighting: "Lucha",
  poison: "Veneno",
  ground: "Tierra",
  flying: "Volador",
  psychic: "Psíquico",
  bug: "Bicho",
  rock: "Roca",
  ghost: "Fantasma",
  dragon: "Dragón",
  dark: "Siniestro",
  steel: "Acero",
  fairy: "Hada",
};

export const COLOR_LABELS: Record<PokemonColor, { label: string; swatch: string }> = {
  black: { label: "Negro", swatch: "#1f2433" },
  blue: { label: "Azul", swatch: "#3d7be0" },
  brown: { label: "Marrón", swatch: "#9a6a3c" },
  gray: { label: "Gris", swatch: "#9aa0b4" },
  green: { label: "Verde", swatch: "#4caf50" },
  pink: { label: "Rosa", swatch: "#f08bbd" },
  purple: { label: "Morado", swatch: "#9b59c6" },
  red: { label: "Rojo", swatch: "#e5484d" },
  white: { label: "Blanco", swatch: "#f4f6fb" },
  yellow: { label: "Amarillo", swatch: "#ffc928" },
};

export const PHASE_LABELS: Record<EvolutionPhase, string> = {
  none: "Sin evolución",
  first: "Primera fase",
  second: "Segunda fase",
  third: "Tercera fase",
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
export const generationLabel = (gen: number) => `Gen ${ROMAN[gen - 1] ?? gen}`;

export const COLUMN_LABELS = ["Pokémon", "Tipos", "Generación", "Fase", "Color", "Pokédex"] as const;
