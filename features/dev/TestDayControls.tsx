"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { formatChallengeNumber } from "@/lib/daily/calendar";
import { advanceTestDay, resetTestDay } from "./test-day-actions";

/**
 * TEMPORARY development tool: floating "TEST: SIGUIENTE DÍA" panel. Only
 * rendered by the site layout under `next dev`; never in production.
 */
export function TestDayControls({ realNumber, offset }: { realNumber: number; offset: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<unknown>) =>
    startTransition(async () => {
      await action();
      router.refresh();
    });

  return (
    <aside
      aria-label="Herramienta de pruebas (solo desarrollo)"
      className="fixed bottom-3 left-3 z-50 flex max-w-[calc(100vw-1.5rem)] flex-col gap-1.5 rounded-2xl border-2 border-dashed border-sun-400/80 bg-night-950/95 p-2.5 text-xs shadow-[0_10px_30px_-10px_rgb(0_0_0/0.8)]"
    >
      <p className="font-black tracking-wider text-sun-300">🧪 MODO PRUEBA · solo desarrollo</p>
      <p className="text-mist">
        Real {formatChallengeNumber(realNumber)}
        {offset > 0 ? (
          <>
            {" · "}
            <strong className="text-white">jugando {formatChallengeNumber(realNumber + offset)}</strong> (+{offset})
          </>
        ) : (
          " · día real"
        )}
      </p>
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(advanceTestDay)}
          className="rounded-lg bg-sun-400 px-2.5 py-1.5 font-black text-night-950 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
        >
          TEST: SIGUIENTE DÍA
        </button>
        {offset > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(resetTestDay)}
            className="rounded-lg border border-white/20 bg-night-700 px-2.5 py-1.5 font-bold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-sun-400"
          >
            Volver al día real
          </button>
        )}
      </div>
    </aside>
  );
}
