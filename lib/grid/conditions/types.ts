import type { Pokemon } from "@/lib/pokemon/types";

/**
 * A Grid condition is a named predicate over our Pokémon model.
 * Conditions are data-driven: the UI only ever sees `ConditionView`,
 * and the engine only ever calls `test`.
 */
export interface GridCondition {
  /** Stable, storable id, e.g. "type:fire", "gen:1", "flag:legendary". */
  id: string;
  category: ConditionCategoryId;
  label: string;
  description: string;
  /** Optional presentation hints (e.g. { pokemonType: "fire" }). */
  meta?: Record<string, string | number>;
  test: (pokemon: Pokemon) => boolean;
}

/** Serializable condition info that can be sent to the client. */
export type ConditionView = Omit<GridCondition, "test"> & { categoryLabel: string };

export type ConditionCategoryId =
  | "type"
  | "generation"
  | "classification"
  | "evolution"
  | "typing"
  | "forms"
  | "stats"
  | "physical";

export interface ConditionCategory {
  id: ConditionCategoryId;
  label: string;
  /** Relative likelihood of the generator picking from this category. */
  weight: number;
  /**
   * Whether conditions of this category may appear on both axes.
   * Types can (dual-types make Fire × Flying meaningful); generations can't
   * (Gen 1 × Gen 2 is always empty).
   */
  allowOnBothAxes: boolean;
  /**
   * Conditions that test memorised numbers (base stats, height, weight)
   * rather than general Pokémon knowledge. The generator limits how many
   * of these a single grid may contain.
   */
  knowledgeHeavy?: boolean;
}
