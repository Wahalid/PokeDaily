"use client";

import { Dialog } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import { MAX_ATTEMPTS } from "@/lib/wordle/types";
import type { WordleStats } from "../progress";

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

function Example({ word, states }: { word: string; states: Array<"correct" | "present" | "absent" | null> }) {
  const tone = { correct: "bg-emerald-500 border-emerald-400", present: "bg-sun-400 border-sun-300 text-night-950", absent: "bg-slate-600/80 border-slate-500/40" };
  return (
    <div className="flex gap-1" aria-hidden>
      {[...word].map((l, i) => (
        <span
          key={i}
          className={`grid size-8 place-items-center rounded-md border-2 text-sm font-black uppercase ${states[i] ? tone[states[i]!] : "border-white/15 bg-night-950/50"}`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}

export function WordleHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a PokéWordle">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-mist">
        <li>Adivina el <strong className="text-white">Pokémon del día</strong> en {MAX_ATTEMPTS} intentos.</li>
        <li>Escribe el nombre de un Pokémon con el número de letras del tablero y pulsa <strong className="text-white">Enviar</strong>.</li>
        <li>Sin espacios ni símbolos: «Mr. Mime» → MRMIME, «Farfetch’d» → FARFETCHD, «Flabébé» → FLABEBE.</li>
      </ul>
      <div className="mt-4 space-y-3 text-sm text-mist">
        <div>
          <Example word="pikachu" states={["correct", null, null, null, null, null, null]} />
          <p className="mt-1"><strong className="text-emerald-300">Verde</strong>: la letra está en esa posición.</p>
        </div>
        <div>
          <Example word="eevee" states={[null, "present", null, null, null]} />
          <p className="mt-1"><strong className="text-sun-300">Amarillo</strong>: la letra está, pero en otra posición.</p>
        </div>
        <div>
          <Example word="onix" states={[null, null, "absent", null]} />
          <p className="mt-1"><strong className="text-white">Gris</strong>: la letra no está (o ya no quedan más).</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-mist-dim">Un nombre que no es un Pokémon, o con otra longitud, no gasta intento. Un nuevo Pokémon cada día.</p>
    </Dialog>
  );
}

export function WordleStatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: WordleStats }) {
  const max = Math.max(1, ...stats.distribution);
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de PokéWordle">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <div className="space-y-2">
        <StatGrid
          items={[
            { label: "Partidas", value: stats.played },
            { label: "% Victorias", value: stats.winRate },
            { label: "Racha actual", value: stats.currentStreak },
            { label: "Mejor racha", value: stats.bestStreak },
          ]}
        />
      </div>
      <h3 className="mt-4 mb-2 text-xs font-bold tracking-wider text-mist uppercase">Intentos por victoria</h3>
      <ol className="space-y-1">
        {stats.distribution.map((count, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-bold">
            <span className="w-3 text-mist">{i + 1}</span>
            <span
              className="rounded bg-brand-500 px-1.5 py-0.5 text-right tabular-nums"
              style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
            >
              {count}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}
