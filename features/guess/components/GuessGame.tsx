"use client";

import { useState, useTransition } from "react";
import { PokemonSearch } from "@/components/pokemon/PokemonSearch";
import { MAX_GUESSES } from "@/lib/guess/types";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { submitGuess } from "../actions";
import { useGuessProgress } from "../use-guess-progress";
import { GuessBoard } from "./GuessBoard";
import { GuessResult } from "./GuessResult";

const SEARCH_LABELS = {
  used: "Probado",
  loading: "Cargando Pokédex…",
  failed: "No se pudo cargar la Pokédex. Revisa tu conexión y recarga.",
  empty: "Escribe un nombre o un número de Pokédex.",
  noResults: "No se encontró ningún Pokémon.",
};

/** Interactive daily "Adivina el Pokémon": counter + search + guesses + result. */
export function GuessGame({ challengeNumber, progressKey }: { challengeNumber: number; progressKey: string }) {
  const { guesses, answer, addGuess } = useGuessProgress(challengeNumber, progressKey);
  const [error, setError] = useState<{ message: string; key: number } | null>(null);
  const [justGuessed, setJustGuessed] = useState(false);
  const [pending, startTransition] = useTransition();

  const won = guesses.some((g) => g.correct);
  const finished = won || guesses.length >= MAX_GUESSES;
  const guessedIds = guesses.map((g) => g.pokemon.id);

  const guess = (pokemon: PokemonSummary) => {
    if (finished || pending) return;
    if (guessedIds.includes(pokemon.id)) {
      setError({ message: "Ya has probado este Pokémon.", key: Date.now() });
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitGuess({ challengeNumber, guessIds: [...guessedIds, pokemon.id] });
        if (!result.ok) {
          setError({ message: result.message, key: Date.now() });
          return;
        }
        setJustGuessed(true);
        addGuess(result.feedback, result.answer);
      } catch {
        setError({ message: "Algo ha fallado. Inténtalo de nuevo.", key: Date.now() });
      }
    });
  };

  return (
    <div>
      <AttemptCounter used={guesses.length} won={won} />

      {finished && answer ? (
        <GuessResult won={won} attempts={guesses.length} answer={answer} />
      ) : (
        <div className="mx-auto mt-5 max-w-md rounded-3xl border border-white/10 bg-night-800/80 p-3 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.7)] sm:p-4">
          {error && (
            <p
              key={error.key}
              role="alert"
              className="mb-3 flex animate-shake items-center gap-2 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm font-semibold text-ember-300"
            >
              <span aria-hidden>❌</span>
              {error.message}
            </p>
          )}
          {/* Remount after each guess to clear the query. */}
          <div className="flex max-h-[min(26rem,55dvh)] flex-col">
            <PokemonSearch
              key={guesses.length}
              onSelect={guess}
              usedIds={guessedIds}
              disabled={pending}
              placeholder="Busca un Pokémon..."
              labels={SEARCH_LABELS}
            />
          </div>
          {pending && <p className="pt-2 text-center text-xs text-mist-dim">Comprobando…</p>}
        </div>
      )}

      <GuessBoard guesses={guesses} animateLatest={justGuessed} />
    </div>
  );
}

function AttemptCounter({ used, won }: { used: number; won: boolean }) {
  return (
    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
      <p className="text-sm font-semibold text-mist tabular-nums">
        Intentos: <span className="text-white">{used}</span>/{MAX_GUESSES}
      </p>
      <div
        role="progressbar"
        aria-label="Intentos usados"
        aria-valuemin={0}
        aria-valuemax={MAX_GUESSES}
        aria-valuenow={used}
        className="flex gap-1.5"
      >
        {Array.from({ length: MAX_GUESSES }, (_, i) => {
          const isWinning = won && i === used - 1;
          return (
            <span
              key={i}
              className={`h-2 w-6 rounded-full transition-colors duration-300 ${
                isWinning ? "bg-emerald-400" : i < used ? (i < 3 ? "bg-brand-500" : i < 6 ? "bg-sun-400" : "bg-ember-500") : "bg-white/10"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
