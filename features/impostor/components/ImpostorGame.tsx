"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { GameToolbar } from "@/components/ui/GameToolbar";
import { GameStatus, type StatusMessage } from "@/components/ui/GameStatus";
import { initialImpostorState } from "@/lib/impostor/play";
import { BOARD_SIZE, type ImpostorBoardView, type ImpostorMode, type ImpostorMoves, type Verdict } from "@/lib/impostor/types";
import { submitImpostorMoves } from "../actions";
import { recordImpostorResult, useImpostorProgress, useImpostorStats, type StoredImpostor } from "../progress";
import { buildImpostorShareText, cardOutcomes, MODE_LABELS } from "../share";
import { CategoryTitle } from "./CategoryTitle";
import { ImpostorCard, type CardLook } from "./ImpostorCard";
import { ImpostorHelpDialog, ImpostorStatsDialog } from "./ImpostorDialogs";
import { ImpostorResult } from "./ImpostorResult";

type Message = StatusMessage;

/** Interactive daily PokéImpostor: mode choice → board (normal) or card-by-card (one-by-one) → result. */
export function ImpostorGame({ challengeNumber, progressKey, board }: { challengeNumber: number; progressKey: string; board: ImpostorBoardView }) {
  const { progress, save } = useImpostorProgress(challengeNumber, progressKey);
  const stats = useImpostorStats(challengeNumber);
  const [message, setMessage] = useState<Message | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const mode = progress.mode;
  const state = progress.state ?? (mode ? initialImpostorState(mode) : null);
  const playing = !state || state.status === "playing";
  const correctTotal = BOARD_SIZE - board.impostorCount;
  const say = (text: string, tone: Message["tone"]) => setMessage((prev) => ({ text, tone, key: (prev?.key ?? 0) + 1 }));

  /** Sends the whole move list; the server replays it and answers with the public state. */
  const send = (moves: ImpostorMoves, next: Omit<StoredImpostor, "key" | "state">, after?: (s: NonNullable<StoredImpostor["state"]>) => void) => {
    startTransition(async () => {
      const result = await submitImpostorMoves({ challengeNumber, moves }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.", "bad");
        return;
      }
      save({ ...next, state: result.state });
      if (result.state.status !== "playing") {
        recordImpostorResult(challengeNumber, { won: result.state.status === "won", score: result.state.score, mode: result.state.mode, help: next.help });
      }
      after?.(result.state);
    });
  };

  const chooseMode = (m: ImpostorMode) => save({ mode: m, help: false, selection: [], decisions: [] });

  // ---- Normal mode -----------------------------------------------------------
  const toggle = (id: number) => {
    if (!playing || pending || id === state?.hintId) return;
    const selection = progress.selection.includes(id) ? progress.selection.filter((x) => x !== id) : [...progress.selection, id];
    save({ ...progress, selection, state: progress.state });
  };
  const check = () => {
    if (!mode || pending) return;
    send({ mode, help: progress.help, selection: progress.selection }, progress, (s) =>
      s.status === "won" ? say("🎉 IMPOSTORES DETECTADOS", "good") : say("💀 HAS CAÍDO EN LA TRAMPA", "bad"),
    );
  };

  // ---- One-by-one mode --------------------------------------------------------
  const index = progress.decisions.length;
  const decide = (verdict: Verdict) => {
    if (!mode || pending || !playing) return;
    const decisions = [...progress.decisions, verdict];
    send({ mode, help: progress.help, decisions }, { ...progress, decisions }, (s) => {
      if (s.status === "lost") say("💀 HAS CAÍDO EN LA TRAMPA", "bad");
      else if (s.status === "won") say("🎉 IMPOSTORES DETECTADOS", "good");
      else say(verdict === "correct" ? "✅ ¡Bien visto!" : "🚨 ¡Impostor desenmascarado!", "good");
    });
  };

  // ---- Help (one per game) ------------------------------------------------------
  const takeHint = () => {
    if (!mode || pending || progress.help || !playing) return;
    const moves: ImpostorMoves =
      mode === "normal" ? { mode, help: true } : { mode, help: true, decisions: progress.decisions };
    send(moves, { ...progress, help: true }, (s) => {
      const hinted = board.cards.find((c) => c.id === s.hintId);
      if (!hinted) return;
      if (mode === "normal") {
        save({ ...progress, help: true, selection: [...new Set([...progress.selection, hinted.id])], state: s });
        say(`💡 ${hinted.name} es correcto.`, "info");
      } else {
        const position = board.cards.findIndex((c) => c.id === hinted.id);
        say(position < index ? `💡 ${hinted.name} es correcto (ya lo habías acertado).` : `💡 ${hinted.name} es correcto.`, "info");
      }
    });
  };

  const outcomes = state && !playing ? cardOutcomes(board.cards.map((c) => c.id), state) : null;
  const lookFor = (id: number, i: number): CardLook => {
    if (outcomes && state) return { kind: "revealed", impostor: !!state.impostors?.includes(id), right: outcomes[i] === "pending" ? null : outcomes[i] === "right" };
    if (id === state?.hintId) return { kind: "hinted" };
    return progress.selection.includes(id) ? { kind: "selected" } : { kind: "idle" };
  };
  const current = mode === "one-by-one" && playing ? board.cards[index] : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <GameToolbar onHelp={() => setDialog("help")} onStats={() => setDialog("stats")} />

      <section
        aria-label="Categoría del día"
        className="panel mx-auto mt-3 max-w-xl p-4 text-center"
      >
        <p className="text-xs font-bold tracking-[0.15em] text-mist uppercase">Categoría del día</p>
        <p className="mt-1 text-xl leading-snug font-black text-balance text-sun-300 uppercase sm:text-2xl">
          <CategoryTitle title={board.title} types={board.types} clause={board.clause} size="lg" />
        </p>
        {board.note && <p className="mt-1.5 text-xs text-mist-dim">{board.note}</p>}
        <p className="mt-2 text-sm text-mist">
          Hay <strong className="text-ember-300">{board.impostorCount} impostores</strong> entre estos {BOARD_SIZE} Pokémon.
          {mode && <span className="ml-1 rounded-md bg-brand-500/20 px-1.5 py-0.5 text-xs font-bold text-brand-300">Modo {MODE_LABELS[mode]}</span>}
        </p>
      </section>

      {!mode && (
        <div className="mx-auto mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => chooseMode("normal")}
            className="panel p-5 text-left transition hover:[--panel-border:rgb(143_169_255/0.55)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 motion-safe:hover:-translate-y-0.5"
          >
            <p className="text-lg font-black">Modo Normal</p>
            <p className="mt-1 text-sm text-mist">Ves los 10 a la vez, seleccionas los correctos y compruebas.</p>
          </button>
          <button
            type="button"
            onClick={() => chooseMode("one-by-one")}
            className="panel panel-loss p-5 text-left transition hover:[--panel-border:rgb(255_138_142/0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 motion-safe:hover:-translate-y-0.5"
          >
            <p className="text-lg font-black">
              Uno a uno <span className="ml-1 rounded-full bg-ember-500/20 px-2 py-0.5 align-middle text-xs text-ember-300">Difícil</span>
            </p>
            <p className="mt-1 text-sm text-mist">Uno por uno, sin vuelta atrás. El primer error termina la partida.</p>
          </button>
          <p className="text-center text-xs text-mist-dim sm:col-span-2">El modo queda fijado para hoy.</p>
        </div>
      )}

      {mode && playing && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          {mode === "normal" ? (
            <Pill>
              Seleccionados <span className="text-white tabular-nums">{progress.selection.length}</span> · correctos: {correctTotal}
            </Pill>
          ) : (
            <Pill>
              <span className="text-white tabular-nums">{Math.min(index + 1, BOARD_SIZE)}</span> / {BOARD_SIZE}
            </Pill>
          )}
          <Button variant="secondary" className="px-3 py-1" disabled={progress.help || pending} onClick={takeHint}>
            💡 {progress.help ? "Pista usada" : "Pista (1)"}
          </Button>
        </div>
      )}

      <GameStatus message={message} pending={pending} className="mt-2" />

      {mode === "one-by-one" && current && (
        <div className="mx-auto mt-1 max-w-sm">
          <div className="h-1.5 overflow-hidden rounded-full bg-night-800" aria-hidden>
            <div className="h-full rounded-full bg-sun-400 transition-all" style={{ width: `${(index / BOARD_SIZE) * 100}%` }} />
          </div>
          <div key={current.id} className="mt-3 animate-fade-up">
            <ImpostorCard name={current.name} sprite={current.sprite} look={current.id === state?.hintId ? { kind: "hinted" } : { kind: "idle" }} size="lg" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("correct")}
              className="rounded-2xl border border-emerald-400/50 bg-emerald-500/15 py-3.5 text-base font-black text-emerald-300 transition hover:bg-emerald-500/25 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sun-400"
            >
              ✅ CORRECTO
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => decide("impostor")}
              className="rounded-2xl border border-ember-500/50 bg-ember-500/15 py-3.5 text-base font-black text-ember-300 transition hover:bg-ember-500/25 active:scale-[0.98] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sun-400"
            >
              🚨 IMPOSTOR
            </button>
          </div>
          {index > 0 && (
            <ol aria-label="Decisiones anteriores" className="mt-4 flex flex-wrap justify-center gap-1.5">
              {board.cards.slice(0, index).map((c, i) => (
                <li
                  key={c.id}
                  className="rounded-full border border-white/10 bg-night-800/80 px-2 py-0.5 text-[11px] font-bold text-mist"
                  title={c.name}
                >
                  {progress.decisions[i] === "correct" ? "✅" : "🚨"} {c.name}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {((mode === "normal" && playing) || !playing) && (
        <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          {board.cards.map((c, i) => (
            <li key={c.id}>
              <ImpostorCard
                name={c.name}
                sprite={c.sprite}
                look={lookFor(c.id, i)}
                onClick={playing ? () => toggle(c.id) : undefined}
                disabled={pending || c.id === state?.hintId}
              />
            </li>
          ))}
        </ul>
      )}

      {mode === "normal" && playing && (
        <div className="mt-4 flex justify-center">
          <Button className="min-w-48 py-3 text-base" disabled={pending || progress.selection.length === 0} onClick={check}>
            COMPROBAR
          </Button>
        </div>
      )}

      {state && !playing && outcomes && (
        <ImpostorResult
          won={state.status === "won"}
          category={board.title}
          categoryTypes={board.types}
          categoryClause={board.clause}
          score={state.score}
          correctTotal={correctTotal}
          correctFound={
            board.cards.filter((c, i) => !state.impostors?.includes(c.id) && outcomes[i] === "right").length
          }
          impostorNames={board.cards.filter((c) => state.impostors?.includes(c.id)).map((c) => c.name)}
          shareText={buildImpostorShareText({
            challengeNumber,
            categoryShort: board.short,
            outcomes,
            mode: state.mode,
            help: progress.help,
            score: state.score,
          })}
        />
      )}

      <ImpostorHelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <ImpostorStatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}
