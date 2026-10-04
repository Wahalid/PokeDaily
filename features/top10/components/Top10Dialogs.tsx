"use client";

import { Dialog } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import { MAX_LIVES } from "@/lib/top10/types";
import type { Top10Stats } from "../progress";

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

export function Top10HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a Top 10">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ol className="list-decimal space-y-2 pl-5 text-sm text-mist">
        <li>Cada día hay un <strong className="text-white">nuevo Top 10</strong>.</li>
        <li>Se muestra el reto: un grupo de Pokémon y una característica (p. ej. «los más pesados de la Generación I»).</li>
        <li>Como pista, ves el <strong className="text-white">tipo</strong> del Pokémon de cada puesto (los dos si tiene dos).</li>
        <li>Busca Pokémon y prueba cuáles están en el ranking.</li>
        <li>Si aciertas, descubres <strong className="text-white">su puesto</strong> y su valor.</li>
        <li>Tienes <strong className="text-white">{MAX_LIVES} vidas</strong>: cada Pokémon que no esté en el Top 10 gasta una.</li>
        <li>¡Encuentra los 10!</li>
      </ol>
      <p className="mt-3 text-xs text-mist-dim">
        Empates: si dos Pokémon tienen el mismo valor, va primero el de número de Pokédex más bajo. Solo se usan especies base
        (sin megaevoluciones ni formas regionales).
      </p>
    </Dialog>
  );
}

export function Top10StatsPanel({ stats }: { stats: Top10Stats }) {
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
          { label: "Vidas / victoria", value: stats.avgLivesLeft },
        ]}
      />
    </div>
  );
}

export function Top10StatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: Top10Stats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de Top 10">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <Top10StatsPanel stats={stats} />
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}
