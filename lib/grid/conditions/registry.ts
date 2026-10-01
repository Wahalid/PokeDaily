import { CONDITION_CATEGORIES, CONDITIONS } from "./catalog";
import type { ConditionCategory, ConditionCategoryId, ConditionView, GridCondition } from "./types";

const byId = new Map(CONDITIONS.map((c) => [c.id, c]));
const categories = new Map(CONDITION_CATEGORIES.map((c) => [c.id, c]));

if (byId.size !== CONDITIONS.length) {
  throw new Error("Duplicate Grid condition ids in catalogue");
}

export function getAllConditions(): readonly GridCondition[] {
  return CONDITIONS;
}

export function getCondition(id: string): GridCondition {
  const condition = byId.get(id);
  if (!condition) throw new Error(`Unknown Grid condition "${id}"`);
  return condition;
}

export function getCategory(id: ConditionCategoryId): ConditionCategory {
  return categories.get(id)!;
}

export function getAllCategories(): readonly ConditionCategory[] {
  return CONDITION_CATEGORIES;
}

export function toConditionView(condition: GridCondition): ConditionView {
  const { id, category, label, description, meta } = condition;
  return { id, category, label, description, meta, categoryLabel: getCategory(category).label };
}
