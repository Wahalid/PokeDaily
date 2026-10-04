"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { MAX_LIVES, TOP_SIZE } from "@/lib/top10/types";
import type { Top10Stats } from "../progress";
import { Top10StatsPanel } from "./Top10Dialogs";

export function Top10Result({
  won,
  found,
  lives,
  stats,
  shareText,
}: {
  won: boolean;
  found: number;
  lives: number;
  stats: Top10Stats;
  shareText: string;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const share = async () => {
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") setStatus("failed");
    }
  };
  const hearts = "❤️".repeat(Math.max(0, lives)) + "❌".repeat(MAX_LIVES - Math.max(0, lives));

  return (
    <section
      aria-live="polite"
      className={`relative mx-auto mt-5 max-w-md animate-fade-up overflow-hidden rounded-3xl border bg-gradient-to-b from-night-700 to-night-800 p-5 text-center ${
        won ? "border-sun-400/30 shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]" : "border-ember-500/30"
      }`}
    >
      <p className={`text-2xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>{won ? "🏆 TOP 10 COMPLETADO" : "TOP 10 TERMINADO"}</p>
      <p className={`mt-1 text-4xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {found}/{TOP_SIZE}
      </p>
      <p className="mt-1 text-lg" aria-label={`Vidas restantes: ${lives} de ${MAX_LIVES}`}>
        {hearts}
      </p>
      {!won && <p className="mt-1 text-sm font-semibold text-mist">Arriba tienes el ranking completo.</p>}
      <AccentBar className="mt-4" />
      <div className="mt-4">
        <Top10StatsPanel stats={stats} />
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={share}>{status === "copied" ? "✓ ¡Copiado!" : "Compartir resultado"}</Button>
        <ButtonLink href="/" variant="secondary">
          Volver a juegos
        </ButtonLink>
      </div>
      {status === "failed" && <p className="mt-3 text-xs text-ember-300">No se pudo compartir. Inténtalo de nuevo.</p>}
    </section>
  );
}
