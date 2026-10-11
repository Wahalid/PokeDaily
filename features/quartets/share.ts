import { formatChallengeNumber } from "@/lib/daily/calendar";
import { TIERS, type Tier } from "@/lib/quartets/types";

/**
 * Spoiler-free result: one row per attempt, each tile coloured by the
 * difficulty of the group that Pokémon belongs to. No Pokémon, no categories.
 */
export function buildQuartetsShareText(params: {
  challengeNumber: number;
  attempts: ReadonlyArray<{ ids: readonly number[] }>;
  tierOf: (id: number) => Tier | undefined;
  won: boolean;
  mistakes: number;
}): string {
  const { challengeNumber, attempts, tierOf, won, mistakes } = params;
  const rows = attempts.map((a) => a.ids.map((id) => TIERS[tierOf(id) ?? 0].emoji).join(""));
  const errors = `${mistakes} ${mistakes === 1 ? "error" : "errores"}`;
  return [
    `PokeDaily Pokémon Groups ${formatChallengeNumber(challengeNumber)}`,
    "",
    ...rows,
    "",
    won ? `✅ Completado · ${errors}` : `❌ No completado · ${errors}`,
  ].join("\n");
}
