"use client";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { StatGrid } from "@/components/ui/StatGrid";
import type { Top10Stats } from "../progress";

export function Top10HelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Cómo se juega a Pokémon Top 10">
      <DialogHeader title="Cómo se juega" onClose={onClose} />
      <ol className="list-decimal space-y-2 pl-5 text-sm text-mist">
        <li>Cada día hay un <strong className="text-white">nuevo Top 10</strong>.</li>
        <li>Se muestra el reto: un grupo de Pokémon y una característica (p. ej. «los más pesados de la Generación I»).</li>
        <li>Como pista, ves el <strong className="text-white">tipo</strong> del Pokémon de cada puesto (los dos si tiene dos).</li>
        <li>Busca Pokémon y prueba cuáles están en el ranking.</li>
        <li>Si aciertas, descubres <strong className="text-white">su puesto</strong> y su valor.</li>
        <li>Fallar <strong className="text-white">no tiene penalización</strong>: sigue probando hasta encontrar los 10.</li>
        <li>Si te atascas, pulsa <strong className="text-white">Give Up</strong> para rendirte y ver el ranking completo.</li>
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
          { label: "Completados", value: stats.won },
          { label: "Abandonados", value: stats.gaveUp },
        ]}
      />
      <StatGrid
        items={[
          { label: "Racha actual", value: stats.currentStreak },
          { label: "Mejor racha", value: stats.bestStreak },
          { label: "Puestos / partida", value: stats.avgFound },
        ]}
      />
    </div>
  );
}

export function Top10StatsDialog({ open, onClose, stats }: { open: boolean; onClose: () => void; stats: Top10Stats }) {
  return (
    <Dialog open={open} onClose={onClose} title="Estadísticas de Pokémon Top 10">
      <DialogHeader title="Estadísticas" onClose={onClose} />
      <Top10StatsPanel stats={stats} />
      <p className="mt-3 text-center text-xs text-mist-dim">Guardadas en este dispositivo.</p>
    </Dialog>
  );
}

/** Confirmation before giving up: nothing is sent (nor revealed) until the player confirms. */
export function Top10GiveUpDialog({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onClose={onCancel} title="¿Rendirse en el Top 10?">
      <DialogHeader title="¿Seguro que quieres rendirte?" onClose={onCancel} />
      <p className="text-sm text-mist">
        Se revelará el <strong className="text-white">ranking completo</strong> y ya no podrás seguir respondiendo en el reto de hoy.
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} data-autofocus>
          Seguir jugando
        </Button>
        <Button onClick={onConfirm}>Sí, rendirme</Button>
      </div>
    </Dialog>
  );
}
