"use client";

import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import type { ImpostorStats } from "../progress";

export function ImpostorHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a PokéImpostor">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-mist">
        <li>Cada día hay una <strong className="text-white">categoría</strong> y 10 Pokémon.</li>
        <li>Algunos la cumplen y otros son <strong className="text-ember-300">impostores</strong>. Te decimos cuántos impostores hay.</li>
        <li>
          <strong className="text-white">Normal</strong>: selecciona todos los que cumplen la categoría y pulsa <strong className="text-white">Comprobar</strong>. Un impostor
          seleccionado o un correcto olvidado = derrota.
        </li>
        <li>
          <strong className="text-white">Uno a uno</strong> (más difícil): los Pokémon salen de uno en uno; decide ✅ correcto o 🚨 impostor. Sin vuelta atrás: el
          primer error termina la partida.
        </li>
        <li>
          <strong className="text-white">💡 Pista</strong> (una por partida): confirma uno de los Pokémon correctos —el menos evidente—. No revela impostores.
        </li>
        <li>Solo cuentan los datos oficiales de la especie: sus tipos, generación, estadísticas base… (sin megaevoluciones ni formas regionales).</li>
      </ul>
      <p className="mt-3 text-xs text-mist-dim">Eliges el modo una vez al día; después queda fijado.</p>
    </Dialog>
  );
}

export function ImpostorStatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: ImpostorStats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de PokéImpostor">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <div className="space-y-2">
        <StatGrid
          items={[
            { label: "Partidas", value: stats.played },
            { label: "Victorias", value: stats.won },
            { label: "Uno a uno", value: stats.oneByOneWins },
          ]}
        />
        <StatGrid
          items={[
            { label: "Racha actual", value: stats.currentStreak },
            { label: "Mejor racha", value: stats.bestStreak },
          ]}
        />
      </div>
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}
