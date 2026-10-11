"use client";

import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import type { CryStats } from "../progress";

export function CryHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a PokéCry">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-mist">
        <li>Cada día hay <strong className="text-white">5 rondas</strong>. En cada una suena el cry de un Pokémon.</li>
        <li>Escúchalo <strong className="text-white">todas las veces que quieras</strong>: no penaliza.</li>
        <li>Elige cuál de los <strong className="text-white">4 Pokémon</strong> es y pulsa <strong className="text-white">Enviar</strong>. La respuesta ya no se puede cambiar.</li>
        <li>Verás si acertaste y cuál era; después pasa a la siguiente ronda.</li>
        <li>Las rondas van de más fácil a más difícil. ¡Intenta el 5/5!</li>
      </ul>
      <p className="mt-3 text-xs text-mist-dim">Activa el sonido del dispositivo. Si un cry no carga, podrás reintentarlo o anular la ronda (⬛).</p>
    </Dialog>
  );
}

export function CryStatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: CryStats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de PokéCry">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <div className="space-y-2">
        <StatGrid
          items={[
            { label: "Jugados", value: stats.played },
            { label: "Plenos 5/5", value: stats.perfect },
            { label: "Media", value: stats.avgScore },
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
