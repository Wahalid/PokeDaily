import type { PokemonSummary } from "@/lib/pokemon/types";

export const GROUP_SIZE = 4;
export const GROUP_COUNT = 4;

/** Visual difficulty of a solved group: 0 = 🟨 easy … 3 = 🟪 very hard. */
export type Tier = 0 | 1 | 2 | 3;

export const TIERS: ReadonlyArray<{ tier: Tier; label: string; emoji: string; icon: string }> = [
  { tier: 0, label: "Fácil", emoji: "🟨", icon: "●" },
  { tier: 1, label: "Normal", emoji: "🟩", icon: "▲" },
  { tier: 2, label: "Difícil", emoji: "🟦", icon: "■" },
  { tier: 3, label: "Muy difícil", emoji: "🟪", icon: "◆" },
];

/** Day difficulty (weekday curve). */
export type DayLevel = "easy" | "medium" | "hard";

/** Server-side solution data (never sent to the client before it is earned). */
export interface QuartetGroup {
  categoryId: string;
  pokemonIds: number[];
  tier: Tier;
}

export interface QuartetBoard {
  groups: QuartetGroup[];
  /** Initial display order of the 16 Pokémon. */
  layout: number[];
}

/** Client-safe view of a solved / revealed group. */
export interface SolvedGroupView {
  categoryId: string;
  label: string;
  tier: Tier;
  pokemon: PokemonSummary[];
}

export type QuartetGuessResponse =
  | { ok: true; result: "correct"; group: SolvedGroupView }
  | { ok: true; result: "one-away" | "wrong" }
  | { ok: false; message: string };

