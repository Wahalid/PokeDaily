"use client";

import { useState, useTransition } from "react";
import { PokemonSearch } from "@/components/pokemon/PokemonSearch";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { GameToolbar } from "@/components/ui/GameToolbar";
import { GameStatus, type StatusMessage } from "@/components/ui/GameStatus";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { TOP_SIZE, type Top10Criterion, type Top10PublicState } from "@/lib/top10/types";
import { submitTop10Guess } from "../actions";
import { recordTop10Result, useTop10Progress, useTop10Stats, type GuessOutcome } from "../progress";
import { buildTop10ShareText } from "../share";
import { RankingList } from "./RankingList";
import { Top10GiveUpDialog, Top10HelpDialog, Top10StatsDialog } from "./Top10Dialogs";
import { Top10Result } from "./Top10Result";

const SEARCH_LABELS = {
  used: "Probado",
  loading: "Cargando Pokédex…",
  failed: "No se pudo cargar la Pokédex. Revisa tu conexión y recarga.",
  empty: "Escribe un nombre o un número de Pokédex.",
  noResults: "No se encontró ningún Pokémon.",
};

type Message = StatusMessage;

/** Interactive daily Top 10: criterion + search + ranking + Give Up + result. No lives. */
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
  const { guesses, outcomes, gaveUpAt, state, save } = useTop10Progress(challengeNumber, progressKey, initialState);
  const stats = useTop10Stats(challengeNumber);
  const [message, setMessage] = useState<Message | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | "give-up" | null>(null);
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
      const nextOutcomes: GuessOutcome[] = [...outcomes, result.result === "correct" ? "correct" : "wrong"];
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
        recordTop10Result(challengeNumber, result.state.status === "won", result.state.found.length);
      }
    });
  };

  /** Only called after the player confirms in the dialog: then the server reveals the full ranking. */
  const giveUp = () => {
    setDialog(null);
    if (!playing || pending || gaveUpAt !== undefined) return;
    startTransition(async () => {
      const result = await submitTop10Guess({ challengeNumber, guessIds: guesses, gaveUpAt: guesses.length }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.", "bad");
        return;
      }
      save(guesses, outcomes, result.state, guesses.length);
      setHighlight(null);
      say("Te has rendido. Este es el Top 10 completo.", "info");
      recordTop10Result(challengeNumber, false, result.state.found.length);
    });
  };

  const arrow = criterion.direction === "desc" ? "↓" : "↑";

  return (
    <div className="mx-auto max-w-xl">
      <GameToolbar onHelp={() => setDialog("help")} onStats={() => setDialog("stats")} />

      <section
        aria-label="Reto de hoy"
        className="panel mt-3 p-4 text-center"
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
        <Pill>
          <span className="text-white tabular-nums">{state.found.length}</span>/{TOP_SIZE}
        </Pill>
        {playing && (
          <Button variant="secondary" className="px-3 py-1" disabled={pending} onClick={() => setDialog("give-up")}>
            <span aria-hidden>🏳️</span> Give Up
          </Button>
        )}
      </div>

      {playing && (
        <div className="panel mt-3 p-3 sm:p-4">
          <div className="flex max-h-[min(22rem,50dvh)] flex-col">
            <PokemonSearch
              resetKey={guesses.length}
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

      <GameStatus message={message} className="mt-2" />

      <div className="mt-1">
        <RankingList clues={state.clues} found={state.found} ranking={state.ranking} highlight={highlight} />
      </div>

      {!playing && (
        <Top10Result
          won={state.status === "won"}
          found={state.found.length}
          stats={stats}
          shareText={buildTop10ShareText({
            challengeNumber,
            criterionShort: criterion.short,
            foundPositions: state.found.map((e) => e.position),
            gaveUp: state.status === "gave-up",
          })}
        />
      )}

      <Top10HelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <Top10StatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
      <Top10GiveUpDialog open={dialog === "give-up"} onCancel={() => setDialog(null)} onConfirm={giveUp} />
    </div>
  );
}
