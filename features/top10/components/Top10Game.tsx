"use client";

import { useState, useTransition } from "react";
import { PokemonSearch } from "@/components/pokemon/PokemonSearch";
import { Button } from "@/components/ui/Button";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { MAX_LIVES, TOP_SIZE, type Top10Criterion, type Top10PublicState } from "@/lib/top10/types";
import { submitTop10Guess } from "../actions";
import { recordTop10Result, useTop10Progress, useTop10Stats } from "../progress";
import { buildTop10ShareText } from "../share";
import { RankingList } from "./RankingList";
import { Top10HelpDialog, Top10StatsDialog } from "./Top10Dialogs";
import { Top10Result } from "./Top10Result";

const SEARCH_LABELS = {
  used: "Probado",
  loading: "Cargando Pokédex…",
  failed: "No se pudo cargar la Pokédex. Revisa tu conexión y recarga.",
  empty: "Escribe un nombre o un número de Pokédex.",
  noResults: "No se encontró ningún Pokémon.",
};

type Message = { text: string; tone: "good" | "bad" | "info"; key: number };

/** Interactive daily Top 10: criterion + lives + search + ranking + result. */
export function Top10Game({
  challengeNumber,
  progressKey,
  criterion,
  initialState,
}: {
  challengeNumber: number;
  progressKey: string;
  criterion: Top10Criterion;
  initialState: Top10PublicState;
}) {
  const { guesses, outcomes, state, save } = useTop10Progress(challengeNumber, progressKey, initialState);
  const stats = useTop10Stats(challengeNumber);
  const [message, setMessage] = useState<Message | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const playing = state.status === "playing";
  // Incrementing key restarts the message animation even when the text repeats.
  const say = (text: string, tone: Message["tone"]) => setMessage((prev) => ({ text, tone, key: (prev?.key ?? 0) + 1 }));

  const guess = (pokemon: PokemonSummary) => {
    if (!playing || pending) return;
    if (guesses.includes(pokemon.id)) {
      say("Ya lo has probado.", "info");
      return;
    }
    startTransition(async () => {
      const nextGuesses = [...guesses, pokemon.id];
      const result = await submitTop10Guess({ challengeNumber, guessIds: nextGuesses }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.", "bad");
        return;
      }
      const nextOutcomes = [...outcomes, result.result];
      save(nextGuesses, nextOutcomes, result.state);
      if (result.result === "correct") {
        setHighlight(result.position ?? null);
        const value = result.state.found.find((e) => e.position === result.position)?.value;
        say(`🎉 ¡ACIERTO! ${pokemon.name} es el #${result.position}${value ? ` · ${value}` : ""}`, "good");
      } else {
        setHighlight(null);
        say(`❌ ${pokemon.name} no está en el Top 10.`, "bad");
      }
      if (result.state.status !== "playing") {
        recordTop10Result(challengeNumber, result.state.status === "won", result.state.lives, result.state.found.length);
      }
    });
  };

  const arrow = criterion.direction === "desc" ? "↓" : "↑";

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex justify-center gap-2">
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setDialog("help")}>
          <span aria-hidden>?</span> Ayuda
        </Button>
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setDialog("stats")}>
          <span aria-hidden>▤</span> Estadísticas
        </Button>
      </div>

      <section
        aria-label="Reto de hoy"
        className="mt-3 rounded-3xl border border-white/10 bg-night-800/80 p-4 text-center shadow-[0_16px_40px_-20px_rgb(0_0_0/0.7)]"
      >
        <p className="text-lg leading-snug font-black text-balance text-sun-300 sm:text-xl">{criterion.title}</p>
        <p className="mt-2 text-sm text-mist">
          Ordenados por <span className="font-bold text-white">{criterion.metricLabel}</span>{" "}
          <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-xs font-bold text-brand-300">
            <span aria-hidden>{arrow}</span> {criterion.directionLabel}
          </span>
        </p>
        <p className="mt-1.5 text-[11px] text-mist-dim">Pista: el tipo de cada puesto · Empates: primero el nº de Pokédex más bajo</p>
      </section>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold">
        <span role="img" aria-label={`Vidas: ${state.lives} de ${MAX_LIVES}`} className="rounded-full bg-night-800/80 px-3 py-1 ring-1 ring-white/10">
          <span aria-hidden>{"❤️".repeat(Math.max(0, state.lives)) + "❌".repeat(MAX_LIVES - Math.max(0, state.lives))}</span>
        </span>
        <span className="rounded-full bg-night-800/80 px-3 py-1 text-mist ring-1 ring-white/10">
          <span className="text-white tabular-nums">{state.found.length}</span>/{TOP_SIZE}
        </span>
      </div>

      {playing && (
        <div className="mt-3 rounded-3xl border border-white/10 bg-night-800/80 p-3 sm:p-4">
          <div className="flex max-h-[min(22rem,50dvh)] flex-col">
            <PokemonSearch
              key={guesses.length}
              onSelect={guess}
              usedIds={guesses}
              disabled={pending}
              placeholder="Busca un Pokémon..."
              labels={SEARCH_LABELS}
            />
          </div>
          {pending && <p className="pt-2 text-center text-xs text-mist-dim">Comprobando…</p>}
        </div>
      )}

      <p aria-live="polite" className="mt-2 min-h-6 text-center text-sm font-bold">
        {message && (
          <span
            key={message.key}
            className={`inline-block animate-fade-up rounded-full px-3 py-0.5 ${
              message.tone === "good" ? "bg-emerald-500/15 text-emerald-300" : message.tone === "bad" ? "bg-ember-500/15 text-ember-300" : "bg-white/10 text-mist"
            } ${message.tone === "bad" ? "animate-shake" : ""}`}
          >
            {message.text}
          </span>
        )}
      </p>

      <div className="mt-1">
        <RankingList clues={state.clues} found={state.found} ranking={state.ranking} highlight={highlight} />
      </div>

      {!playing && (
        <Top10Result
          won={state.status === "won"}
          found={state.found.length}
          lives={state.lives}
          stats={stats}
          shareText={buildTop10ShareText({
            challengeNumber,
            criterionShort: criterion.short,
            foundPositions: state.found.map((e) => e.position),
            lives: state.lives,
          })}
        />
      )}

      <Top10HelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <Top10StatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}
