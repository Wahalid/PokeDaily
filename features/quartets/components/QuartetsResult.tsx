"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { QuartetsStats } from "../use-quartets-progress";
import { StatsPanel } from "./QuartetsDialogs";

/** End-of-game panel (the groups themselves are shown above it). */
export function QuartetsResult({
  won,
  mistakes,
  stats,
  shareText,
}: {
  won: boolean;
  mistakes: number;
  stats: QuartetsStats;
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

  return (
    <section
      aria-live="polite"
      className={`relative mx-auto mt-5 max-w-md animate-fade-up overflow-hidden rounded-3xl border bg-gradient-to-b from-night-700 to-night-800 p-5 text-center ${
        won ? "border-sun-400/30 shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]" : "border-ember-500/30"
      }`}
    >
      <p className="text-2xl font-black tracking-tight">{won ? "🎉 ¡CUARTETOS COMPLETADO!" : "¡Mañana más!"}</p>
      <p className="mt-1 text-sm font-semibold text-mist">
        {won ? "Has encontrado los 4 grupos" : "Estos eran los 4 grupos"} · {mistakes} {mistakes === 1 ? "error" : "errores"}
      </p>
      <AccentBar className="mt-4" />
      <div className="mt-4">
        <StatsPanel stats={stats} />
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={share}>{status === "copied" ? "✓ ¡Copiado!" : "Compartir"}</Button>
        <ButtonLink href="/" variant="secondary">
          Volver a juegos
        </ButtonLink>
      </div>
      {status === "failed" && <p className="mt-3 text-xs text-ember-300">No se pudo compartir. Inténtalo de nuevo.</p>}
    </section>
  );
}
