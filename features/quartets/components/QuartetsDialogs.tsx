"use client";

import { Dialog } from "@/components/ui/Dialog";
import { MAX_MISTAKES, TIERS } from "@/lib/quartets/types";
import type { QuartetsStats } from "../use-quartets-progress";
import { TIER_STYLES } from "../tier-styles";

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

export function HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a Cuartetos">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <div className="space-y-3 overflow-y-auto text-sm text-mist">
        <p>
          Encuentra los <strong className="text-white">4 grupos de 4 Pokémon</strong> que comparten algo en común.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Selecciona 4 cartas y pulsa <strong className="text-white">Comprobar</strong>.</li>
          <li>Tienes {MAX_MISTAKES} vidas. Cada error resta una.</li>
          <li>Si 3 de tus 4 cartas son del mismo grupo verás <strong className="text-white">«¡A una!»</strong>.</li>
          <li>Repetir una combinación ya probada no cuesta vida.</li>
          <li>Las categorías pueden ser tipos, generaciones, habilidades, medidas…</li>
        </ul>
        <p>Cada grupo tiene una dificultad, que solo descubrirás al resolverlo:</p>
        <ul className="grid grid-cols-2 gap-2">
          {TIERS.map((t) => (
            <li key={t.tier} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${TIER_STYLES[t.tier].bar}`}>
              <span aria-hidden className={`grid size-5 place-items-center rounded-full text-[10px] ${TIER_STYLES[t.tier].chip}`}>
                {t.icon}
              </span>
              <span className="font-semibold text-white">{t.label}</span>
            </li>
          ))}
        </ul>
        <p>Un nuevo Cuartetos cada día, igual para todos.</p>
      </div>
    </Dialog>
  );
}

export function StatsPanel({ stats }: { stats: QuartetsStats }) {
  const items = [
    { label: "Jugadas", value: stats.played },
    { label: "% victorias", value: stats.winRate },
    { label: "Racha actual", value: stats.currentStreak },
    { label: "Mejor racha", value: stats.bestStreak },
  ];
  return (
    <dl className="grid grid-cols-4 gap-2 text-center">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-night-900/60 px-1 py-2">
          <dd className="text-xl font-black tabular-nums">{item.value}</dd>
          <dt className="text-[10px] leading-tight font-semibold text-mist uppercase">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function StatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: QuartetsStats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de Cuartetos">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <StatsPanel stats={stats} />
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}
