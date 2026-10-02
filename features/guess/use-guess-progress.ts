import type { GuessFeedback } from "@/lib/guess/types";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { useLocalStorage } from "@/lib/storage/local-store";

interface StoredGuessProgress {
  /** Opaque key of the daily puzzle; progress for a different key is ignored. */
  key?: string;
  guesses: GuessFeedback[];
  answer?: PokemonSummary;
}

const EMPTY: StoredGuessProgress = { guesses: [] };

/** Player progress for one daily "Adivina el Pokémon", persisted in localStorage. */
export function useGuessProgress(challengeNumber: number, progressKey: string) {
  const [stored, setStored] = useLocalStorage<StoredGuessProgress>(`pokedaily:guess:${challengeNumber}`, EMPTY);
  const valid = stored.key === progressKey && Array.isArray(stored.guesses);
  const guesses = valid ? stored.guesses : EMPTY.guesses;
  const answer = valid ? stored.answer : undefined;

  const addGuess = (feedback: GuessFeedback, revealed?: PokemonSummary) =>
    setStored({ key: progressKey, guesses: [...guesses, feedback], answer: revealed ?? answer });

  return { guesses, answer, addGuess };
}
