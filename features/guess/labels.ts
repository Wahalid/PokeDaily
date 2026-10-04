import type { EvolutionPhase } from "@/lib/guess/types";
import { romanNumeral } from "@/lib/pokemon/labels-es";

/** Spanish presentation labels for "Adivina el Pokémon" (UI only). */

// Type and colour labels are shared with other Spanish-language games.
export { COLOR_LABELS, TYPE_LABELS } from "@/lib/pokemon/labels-es";

export const PHASE_LABELS: Record<EvolutionPhase, string> = {
  none: "Sin evolución",
  first: "Primera fase",
  second: "Segunda fase",
  third: "Tercera fase",
};

export const generationLabel = (gen: number) => `Gen ${romanNumeral(gen)}`;

export const COLUMN_LABELS = ["Pokémon", "Tipos", "Generación", "Fase", "Color", "Pokédex"] as const;
