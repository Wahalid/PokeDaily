import { toSummary } from "@/lib/pokemon/pokedex";
import type { Pokemon } from "@/lib/pokemon/types";
import type { EvolutionPhase, GuessFeedback } from "./types";

/**
 * Evolution phase from our data: species without an evolution family are
 * "none"; otherwise the stage in their chain (1 → first, 2 → second, 3 → third).
 * Note: baby Pokémon count as the first stage (Pichu → Pikachu → Raichu).
 */
export function evolutionPhase(pokemon: Pokemon): EvolutionPhase {
  if (!pokemon.evolution.hasEvolutionFamily) return "none";
  if (pokemon.evolution.stage <= 1) return "first";
  if (pokemon.evolution.stage === 2) return "second";
  return "third";
}

/** Pure comparison of a guess with the secret Pokémon. */
export function compareGuess(guess: Pokemon, secret: Pokemon): GuessFeedback {
  const phase = evolutionPhase(guess);
  return {
    pokemon: toSummary(guess),
    types: guess.types.map((type) => ({ type, match: secret.types.includes(type) })),
    generation: { value: guess.generation, match: guess.generation === secret.generation },
    phase: { value: phase, match: phase === evolutionPhase(secret) },
    color: { value: guess.color, match: guess.color === secret.color },
    dex: {
      value: guess.dexNumber,
      direction:
        guess.dexNumber === secret.dexNumber ? "match" : secret.dexNumber > guess.dexNumber ? "higher" : "lower",
    },
    correct: guess.id === secret.id,
  };
}
