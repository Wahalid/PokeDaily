"use client";

import { useState, useTransition } from "react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { Button } from "@/components/ui/Button";
import type { BingoCellView, BingoMove, BingoPublicState } from "@/lib/bingo/types";
import { submitBingoMoves } from "../actions";
import { recordBingoResult, useBingoProgress, useBingoStats } from "../progress";
import { buildBingoShareText } from "../share";
import { BingoCell, type CellFlash } from "./BingoCell";
import { BingoHelpDialog, BingoStatsDialog } from "./BingoDialogs";
import { BingoResult } from "./BingoResult";

type Message = { text: string; tone: "good" | "bad" | "info"; key: number };

/** Interactive daily PokéBingo: counters + current card + 4×4 board + result. */
export function BingoGame({
  challengeNumber,
  progressKey,
  cells,
  initialState,
}: {
  challengeNumber: number;
  progressKey: string;
  cells: BingoCellView[];
  initialState: BingoPublicState;
}) {
  const { moves, state, save } = useBingoProgress(challengeNumber, progressKey, initialState);
  const stats = useBingoStats(challengeNumber);
  const [selected, setSelected] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ cell: number; kind: CellFlash } | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const playing = state.status === "playing";
  const filled = state.placed.filter(Boolean).length;
  // Incrementing key restarts the message animation even when the text repeats.
  const say = (text: string, tone: Message["tone"]) => setMessage((prev) => ({ text, tone, key: (prev?.key ?? 0) + 1 }));

  const send = (move: BingoMove) => {
    if (!playing || pending) return;
    startTransition(async () => {
      const nextMoves = [...moves, move];
      const result = await submitBingoMoves({ challengeNumber, moves: nextMoves }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.", "bad");
        return;
      }
      save(nextMoves, result.state);
      setSelected(null);
      const last = result.last;
      if (last?.kind === "correct") {
        setFlash({ cell: last.cell, kind: "placed" });
        say(`¡Bien! ${last.pokemon.name} colocado`, "good");
      } else if (last?.kind === "wrong") {
        setFlash({ cell: last.cell, kind: "wrong" });
        setTimeout(() => setFlash(null), 600);
        say(`❌ ERROR: ${last.pokemon.name} no cumple «${cells[last.cell].label}». Prueba en otra casilla.`, "bad");
      } else if (last?.kind === "skip") {
        say(`${last.pokemon.name} descartado`, "info");
      }
      if (result.autoDiscarded.length > 0) {
        const names = result.autoDiscarded.map((p) => p.name).join(", ");
        say(`${names} no encaja${result.autoDiscarded.length > 1 ? "n" : ""} en ninguna casilla libre: descartado sin coste`, "info");
      }
      if (result.state.status !== "playing") {
        recordBingoResult(challengeNumber, result.state.status === "won", result.state.placed.filter(Boolean).length);
      }
    });
  };

  const onCell = (index: number) => {
    if (!playing || pending || state.placed[index]) return;
    if (selected === index) send({ type: "place", cell: index });
    else setSelected(index);
  };

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

      <Counters skips={state.skips} filled={filled} />

      {playing && state.current && (
        <section
          aria-label="Pokémon actual"
          className="mt-3 flex items-center gap-3 rounded-3xl border border-white/10 bg-night-800/80 p-3 shadow-[0_16px_40px_-20px_rgb(0_0_0/0.7)] sm:gap-4 sm:p-4"
        >
          <PokemonSprite
            key={state.current.id}
            src={state.current.sprite}
            name={state.current.name}
            size={96}
            className="size-16 shrink-0 animate-pop drop-shadow-[0_6px_10px_rgb(0_0_0/0.4)] sm:size-20"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider text-mist-dim uppercase">
              Pokémon {state.cardNumber} de {state.deckSize}
            </p>
            <p className="truncate text-xl font-black">{state.current.name}</p>
            <p className="text-xs text-mist">
              {selected === null ? "¿Dónde lo colocas? Toca una casilla." : "Pulsa «Colocar» o toca otra vez la casilla."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Button className="px-4" disabled={pending || selected === null} onClick={() => selected !== null && send({ type: "place", cell: selected })}>
              Colocar
            </Button>
            <Button variant="secondary" className="px-4" disabled={pending || state.skips === 0} onClick={() => send({ type: "skip" })}>
              Descartar
            </Button>
          </div>
        </section>
      )}

      <p aria-live="polite" className="mt-2 min-h-6 text-center text-sm font-bold">
        {message && (
          <span
            key={message.key}
            className={`inline-block animate-fade-up rounded-full px-3 py-0.5 ${
              message.tone === "good" ? "bg-emerald-500/15 text-emerald-300" : message.tone === "bad" ? "bg-ember-500/15 text-ember-300" : "bg-white/10 text-mist"
            }`}
          >
            {message.text}
          </span>
        )}
      </p>

      <div role="group" aria-label="Tablero de PokéBingo" className="mt-1 grid grid-cols-4 gap-1.5 sm:gap-2.5">
        {cells.map((cell, i) => (
          <BingoCell
            key={cell.categoryId}
            cell={cell}
            pokemon={state.placed[i]}
            selected={selected === i}
            playable={playing && !pending}
            flash={flash?.cell === i ? flash.kind : null}
            error={playing && state.wrongCells.includes(i)}
            finished={!playing}
            onSelect={() => onCell(i)}
          />
        ))}
      </div>

      {!playing && state.endReason && (
        <BingoResult
          won={state.status === "won"}
          filled={filled}
          endReason={state.endReason}
          stats={stats}
          shareText={buildBingoShareText({
            challengeNumber,
            filled: state.placed.map(Boolean),
            won: state.status === "won",
          })}
        />
      )}

      <BingoHelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <BingoStatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}

function Counters({ skips, filled }: { skips: number; filled: number }) {
  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold sm:gap-3">
      <span className="rounded-full bg-night-800/80 px-3 py-1 text-mist ring-1 ring-white/10">
        SALTOS: <span className="text-white tabular-nums">{skips}</span>
      </span>
      <span className="rounded-full bg-night-800/80 px-3 py-1 text-mist ring-1 ring-white/10">
        <span className="text-white tabular-nums">{filled}</span>/16
      </span>
    </div>
  );
}
