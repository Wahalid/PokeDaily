"use client";

import { useState, useTransition } from "react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { Button } from "@/components/ui/Button";
import { CRY_ROUNDS, VOID_CHOICE, type CryPublicState, type CryResult } from "@/lib/cry/types";
import { submitCryChoices } from "../actions";
import { recordCryResult, useCryProgress, useCryStats } from "../progress";
import { buildCryShareText, roundSquares } from "../share";
import { CryHelpDialog, CryStatsDialog } from "./CryDialogs";
import { CryPlayer } from "./CryPlayer";
import { CryResultPanel } from "./CryResultPanel";

/** Interactive daily PokéCry: 5 rounds of listen → pick 1 of 4 → SUBMIT → feedback → NEXT. */
export function CryGame({ challengeNumber, progressKey, initialState }: { challengeNumber: number; progressKey: string; initialState: CryPublicState }) {
  const { progress, save } = useCryProgress(challengeNumber, progressKey, initialState);
  const stats = useCryStats(challengeNumber);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const { state, choices, seen } = progress;
  // The round on screen: the last answered one while its feedback is shown, otherwise the current one.
  const reviewing = seen < state.results.length;
  const finished = state.status === "finished" && !reviewing;
  const roundIndex = reviewing ? state.results.length - 1 : (state.current?.index ?? CRY_ROUNDS - 1);
  const result: CryResult | undefined = reviewing ? state.results[roundIndex] : undefined;
  const options = result ? result.options : (state.current?.options ?? []);

  const submit = (choice: number) => {
    if (pending || reviewing || !state.current) return;
    startTransition(async () => {
      const next = [...choices, choice];
      const r = await submitCryChoices({ challengeNumber, choices: next }).catch(() => null);
      if (!r || !r.ok) {
        setError(r?.message ?? "Algo ha fallado. Inténtalo de nuevo.");
        return;
      }
      setError(null);
      save({ choices: next, state: r.state, seen });
      if (r.state.status === "finished") recordCryResult(challengeNumber, r.state.score);
    });
  };
  const nextRound = () => {
    setSelected(null);
    save({ choices, state, seen: seen + 1 });
  };

  const squares = roundSquares(state.results);

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

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm font-black tracking-wider text-sun-300">
          CRY <span className="text-white tabular-nums">{Math.min(roundIndex + 1, CRY_ROUNDS)}</span>/{CRY_ROUNDS}
        </p>
        <p aria-label={`Progreso: ${state.score} aciertos de ${state.results.length} rondas jugadas`} className="text-sm tracking-widest">
          {squares.map((s, i) => (
            <span key={i} aria-hidden className={i === roundIndex && !finished ? "rounded-sm ring-2 ring-sun-400/70" : ""}>
              {s}
            </span>
          ))}
        </p>
      </div>

      {!finished && (
        <>
          <div className="mt-3">
            <CryPlayer
              key={`${challengeNumber}-${roundIndex}`}
              src={`/api/cry/${challengeNumber}/${roundIndex + 1}`}
              round={roundIndex + 1}
              onGiveUp={reviewing ? undefined : () => submit(VOID_CHOICE)}
            />
          </div>

          <div role="radiogroup" aria-label="¿Qué Pokémon es?" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {options.map((o) => {
              const isAnswer = result?.answer === o.id;
              const isChoice = result?.choice === o.id;
              const isSelected = !reviewing && selected === o.id;
              const tone = result
                ? isAnswer
                  ? "border-emerald-400 bg-emerald-500/15"
                  : isChoice
                    ? "border-ember-500 bg-ember-500/15"
                    : "border-white/5 bg-night-800/50 opacity-60"
                : isSelected
                  ? "border-sun-400 bg-sun-400/10 shadow-[0_0_0_1px_rgb(255_201_40/0.6),0_10px_24px_-12px_rgb(255_201_40/0.5)]"
                  : "border-white/10 bg-night-800/80 hover:border-white/30 hover:bg-night-700";
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected || isChoice}
                  disabled={reviewing || pending}
                  onClick={() => setSelected(o.id)}
                  aria-label={`${o.name}${result ? (isAnswer ? " — respuesta correcta" : isChoice ? " — tu elección" : "") : ""}`}
                  className={`relative flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 px-2 pt-4 pb-2 transition active:scale-[0.97] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 ${tone}`}
                >
                  {(isSelected || (result && (isAnswer || isChoice))) && (
                    <span
                      aria-hidden
                      className={`absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-full text-xs font-black ${
                        result ? (isAnswer ? "bg-emerald-500 text-white" : "bg-ember-500 text-white") : "bg-sun-400 text-night-950"
                      }`}
                    >
                      {result ? (isAnswer ? "✓" : "✗") : "✓"}
                    </span>
                  )}
                  <PokemonSprite src={o.sprite} name="" size={96} className="size-20" />
                  <span className="w-full truncate text-center text-sm font-bold">{o.name}</span>
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="mt-4 text-center">
            {result ? (
              <div className="animate-fade-up">
                {result.choice === VOID_CHOICE ? (
                  <p className="text-lg font-black text-mist">⬛ Ronda anulada</p>
                ) : result.correct ? (
                  <p className="animate-pop text-xl font-black text-emerald-300">✅ ¡CORRECTO!</p>
                ) : (
                  <p className="text-xl font-black text-ember-300">❌ INCORRECTO</p>
                )}
                {!result.correct && (
                  <p className="mt-1 text-sm text-mist">
                    El Pokémon era: <strong className="text-white">{options.find((o) => o.id === result.answer)?.name}</strong>
                  </p>
                )}
                <Button className="mt-3 min-w-52 py-3 text-base" onClick={nextRound}>
                  {roundIndex + 1 === CRY_ROUNDS ? "VER RESULTADO" : "SIGUIENTE"}
                </Button>
              </div>
            ) : (
              <>
                <Button className="min-w-52 py-3 text-base" disabled={selected === null || pending} onClick={() => selected !== null && submit(selected)}>
                  {pending ? "Comprobando…" : "ENVIAR"}
                </Button>
                {error && <p className="mt-2 text-sm font-bold text-ember-300">{error}</p>}
              </>
            )}
          </div>
        </>
      )}

      {finished && (
        <CryResultPanel challengeNumber={challengeNumber} score={state.score} squares={squares} shareText={buildCryShareText({ challengeNumber, results: state.results })} />
      )}

      <CryHelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <CryStatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}
