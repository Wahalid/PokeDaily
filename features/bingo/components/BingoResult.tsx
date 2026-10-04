"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CELL_COUNT, type BingoEndReason } from "@/lib/bingo/types";
import type { BingoStats } from "../progress";
import { BingoStatsPanel } from "./BingoDialogs";

const REASONS: Record<BingoEndReason, string> = {
  complete: "Victoria",
  "no-lives": "Te has quedado sin vidas",
  "deck-exhausted": "Se han acabado los Pokémon del mazo",
};

export function BingoResult({
  won,
  filled,
  endReason,
  stats,
  shareText,
}: {
  won: boolean;
  filled: number;
  endReason: BingoEndReason;
  stats: BingoStats;
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
      <p className={`text-3xl font-black tracking-tight ${won ? "animate-pop" : ""}`}>{won ? "🎯 ¡BINGO!" : "BINGO TERMINADO"}</p>
      <p className={`mt-1 text-4xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {filled}/{CELL_COUNT}
      </p>
      <p className="mt-1 text-sm font-semibold text-mist">{REASONS[endReason]}</p>
      <AccentBar className="mt-4" />
      <div className="mt-4">
        <BingoStatsPanel stats={stats} />
      </div>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {won && <Button onClick={share}>{status === "copied" ? "✓ ¡Copiado!" : "Compartir resultado"}</Button>}
        <ButtonLink href="/" variant="secondary">
          Volver a juegos
        </ButtonLink>
      </div>
      {status === "failed" && <p className="mt-3 text-xs text-ember-300">No se pudo compartir. Inténtalo de nuevo.</p>}
    </section>
  );
}
