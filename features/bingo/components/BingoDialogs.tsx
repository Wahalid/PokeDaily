"use client";

import { Dialog } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import { CELL_COUNT, DECK_SIZE, MAX_SKIPS } from "@/lib/bingo/types";
import type { BingoStats } from "../progress";

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mt-1 mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-tight">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="grid size-9 place-items-center rounded-full text-mist transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sun-400"
      >
        ✕
      </button>
    </div>
  );
}

export function BingoHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a PokéBingo">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ol className="list-decimal space-y-2 pl-5 text-sm text-mist">
        <li>Recibes Pokémon <strong className="text-white">uno a uno</strong> ({DECK_SIZE} en total).</li>
        <li>Colócalos en una casilla <strong className="text-white">que cumpla su condición</strong>: toca la casilla y pulsa «Colocar».</li>
        <li>
          Si no cumple la condición, la casilla marca <strong className="text-ember-300">ERROR</strong>: sin penalización, puedes probar ese mismo Pokémon en otras
          casillas.
        </li>
        <li>Tienes <strong className="text-white">{MAX_SKIPS} saltos</strong> para descartar Pokémon. Sin saltos, un Pokémon que no encaja en ninguna casilla libre se descarta solo.</li>
        <li>Completa las <strong className="text-white">{CELL_COUNT} casillas</strong> para hacer ¡BINGO!</li>
      </ol>
      <p className="mt-3 text-xs text-mist-dim">Un nuevo PokéBingo cada día, igual para todos.</p>
    </Dialog>
  );
}

export function BingoStatsPanel({ stats }: { stats: BingoStats }) {
  return (
    <div className="space-y-2">
      <StatGrid
        items={[
          { label: "Partidas", value: stats.played },
          { label: "Victorias", value: stats.won },
          { label: "Derrotas", value: stats.lost },
        ]}
      />
      <StatGrid
        items={[
          { label: "Racha actual", value: stats.currentStreak },
          { label: "Mejor racha", value: stats.bestStreak },
          { label: "Casillas / partida", value: stats.avgFilled },
        ]}
      />
    </div>
  );
}

export function BingoStatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: BingoStats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de PokéBingo">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <BingoStatsPanel stats={stats} />
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}
