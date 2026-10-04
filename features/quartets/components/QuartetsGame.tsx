"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { GROUP_SIZE, MAX_MISTAKES, type SolvedGroupView, type Tier } from "@/lib/quartets/types";
import { revealQuartets, submitQuartet } from "../actions";
import { buildQuartetsShareText } from "../share";
import { attemptKey, recordQuartetsResult, useQuartetsProgress, useQuartetsStats } from "../use-quartets-progress";
import { HelpDialog, StatsDialog } from "./QuartetsDialogs";
import { QuartetCard } from "./QuartetCard";
import { QuartetsResult } from "./QuartetsResult";
import { SolvedGroup } from "./SolvedGroup";

type Message = { text: string; tone: "info" | "good" | "bad"; key: number };

/** Interactive daily Cuartetos: solved groups + 4×4 board + lives + controls + result. */
export function QuartetsGame({
  challengeNumber,
  progressKey,
  cards,
}: {
  challengeNumber: number;
  progressKey: string;
  cards: PokemonSummary[];
}) {
  const initialOrder = useMemo(() => cards.map((c) => c.id), [cards]);
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const progress = useQuartetsProgress(challengeNumber, progressKey, initialOrder);
  const stats = useQuartetsStats(challengeNumber);
  const [selection, setSelection] = useState<number[]>([]);
  const [shaking, setShaking] = useState<number[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const finished = progress.won || progress.lost;
  const solvedIds = new Set(progress.solved.flatMap((g) => g.pokemon.map((p) => p.id)));
  const remaining = progress.order.filter((id) => !solvedIds.has(id));
  const unsolvedRevealed = (progress.revealed ?? []).filter((g) => !progress.solved.some((s) => s.categoryId === g.categoryId));
  const say = (text: string, tone: Message["tone"]) => setMessage({ text, tone, key: Date.now() });

  const toggle = (id: number) => {
    if (finished || pending) return;
    setSelection((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : current.length < GROUP_SIZE ? [...current, id] : current,
    );
  };

  const shuffle = () => progress.setOrder([...progress.order.filter((id) => solvedIds.has(id)), ...shuffledCopy(remaining)]);

  const reveal = (wrongSelections: number[][]) =>
    startTransition(async () => {
      const result = await revealQuartets({ challengeNumber, wrongSelections }).catch(() => null);
      if (result?.ok) progress.setRevealed(result.groups);
      else say("No se pudieron mostrar los grupos. Inténtalo de nuevo.", "bad");
    });

  const check = () => {
    if (selection.length !== GROUP_SIZE || pending || finished) return;
    const picked = selection;
    if (progress.triedKeys.has(attemptKey(picked))) {
      say("Ya has probado esa combinación", "info");
      return;
    }
    startTransition(async () => {
      const result = await submitQuartet({ challengeNumber, selection: picked }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.", "bad");
        return;
      }
      if (result.result === "correct") {
        progress.addAttempt({ ids: picked, result: "correct" }, result.group);
        setSelection([]);
        say("¡Correcto!", "good");
        if (progress.solved.length + 1 === 4) recordQuartetsResult(challengeNumber, true, progress.mistakes);
        return;
      }
      progress.addAttempt({ ids: picked, result: result.result });
      setShaking(picked);
      setTimeout(() => setShaking([]), 400);
      say(result.result === "one-away" ? "¡A una!" : "Incorrecto", "bad");
      if (progress.mistakes + 1 >= MAX_MISTAKES) {
        setSelection([]);
        recordQuartetsResult(challengeNumber, false, MAX_MISTAKES);
        const wrong = [...progress.attempts.filter((a) => a.result !== "correct").map((a) => a.ids), picked];
        reveal(wrong);
      }
    });
  };

  const tierOf = (id: number): Tier | undefined =>
    [...progress.solved, ...(progress.revealed ?? [])].find((g: SolvedGroupView) => g.pokemon.some((p) => p.id === id))?.tier;

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

      {(progress.solved.length > 0 || unsolvedRevealed.length > 0) && (
        <ol aria-label="Grupos resueltos" className="mt-4 flex flex-col gap-2">
          {progress.solved.map((g) => (
            <SolvedGroup key={g.categoryId} group={g} />
          ))}
          {unsolvedRevealed.map((g) => (
            <SolvedGroup key={g.categoryId} group={g} revealed />
          ))}
        </ol>
      )}

      {!finished && (
        <div role="group" aria-label="Tablero: selecciona 4 Pokémon" className="mt-4 grid grid-cols-4 gap-1.5 sm:gap-2.5">
          {remaining.map((id) => {
            const pokemon = byId.get(id);
            if (!pokemon) return null;
            const state = shaking.includes(id) ? "wrong" : selection.includes(id) ? "selected" : "idle";
            return (
              <QuartetCard key={id} pokemon={pokemon} state={state} disabled={pending} onToggle={() => toggle(id)} />
            );
          })}
        </div>
      )}

      <p aria-live="polite" className="mt-3 min-h-6 text-center text-sm font-bold">
        {message && (
          <span
            key={message.key}
            className={`inline-block animate-fade-up rounded-full px-3 py-0.5 ${
              message.tone === "good"
                ? "bg-emerald-500/15 text-emerald-300"
                : message.tone === "bad"
                  ? "bg-ember-500/15 text-ember-300"
                  : "bg-white/10 text-mist"
            }`}
          >
            {message.text}
          </span>
        )}
      </p>

      {!finished && (
        <>
          <Lives left={MAX_MISTAKES - progress.mistakes} />
          <div className="mt-3 flex justify-center gap-2">
            <Button variant="secondary" className="px-3 sm:px-5" onClick={shuffle} disabled={pending}>
              Barajar
            </Button>
            <Button variant="secondary" className="px-3 sm:px-5" onClick={() => setSelection([])} disabled={pending || selection.length === 0}>
              Deseleccionar
            </Button>
            <Button className="px-4 sm:px-6" onClick={check} disabled={pending || selection.length !== GROUP_SIZE}>
              {pending ? "Comprobando…" : "Comprobar"}
            </Button>
          </div>
        </>
      )}

      {progress.lost && !progress.revealed && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => reveal(progress.attempts.filter((a) => a.result !== "correct").map((a) => a.ids))}
          >
            Mostrar los grupos
          </Button>
        </div>
      )}

      {finished && (
        <QuartetsResult
          won={progress.won}
          mistakes={progress.mistakes}
          stats={stats}
          shareText={buildQuartetsShareText({
            challengeNumber,
            attempts: progress.attempts,
            tierOf,
            won: progress.won,
            mistakes: progress.mistakes,
          })}
        />
      )}

      <HelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <StatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}

/** Player-triggered shuffle (cosmetic; the daily board itself is deterministic). */
function shuffledCopy(ids: readonly number[]): number[] {
  const out = ids.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function Lives({ left }: { left: number }) {
  return (
    <div className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-mist">
      <span>Vidas:</span>
      <span role="img" aria-label={`Te quedan ${left} de ${MAX_MISTAKES} vidas`} className="flex gap-1.5">
        {Array.from({ length: MAX_MISTAKES }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={`size-3 rounded-full transition-colors duration-300 ${i < left ? "bg-ember-500 shadow-[0_0_8px_rgb(229_72_77/0.6)]" : "bg-white/10 ring-1 ring-white/20"}`}
          />
        ))}
      </span>
    </div>
  );
}
