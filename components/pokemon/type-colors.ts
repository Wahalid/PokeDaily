import type { PokemonType } from "@/lib/pokemon/types";

/** Brand-neutral colours for Pokémon types (presentation only). */
export const TYPE_COLORS: Record<PokemonType, string> = {
  normal: "#9a9a7d",
  fire: "#f0803c",
  water: "#5a8ef0",
  electric: "#f2c21b",
  grass: "#5fb94a",
  ice: "#6fcfd0",
  fighting: "#c4352c",
  poison: "#a04aa0",
  ground: "#d9b45a",
  flying: "#9a86ee",
  psychic: "#f2577f",
  bug: "#a2b81f",
  rock: "#b49c3a",
  ghost: "#6c5798",
  dragon: "#6c3cf2",
  dark: "#6c584a",
  steel: "#a8a8c4",
  fairy: "#e48fb0",
};

/** Picks dark or white text for a type colour, whichever reads better (WCAG luminance). */
export function readableTextOn(hex: string): "#08112b" | "#ffffff" {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast vs white = 1.05 / (L + 0.05); vs navy ≈ (L + 0.05) / 0.056
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.056 ? "#ffffff" : "#08112b";
}
