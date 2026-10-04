"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { formatChallengeNumber } from "@/lib/daily/calendar";
import { CRY_ROUNDS } from "@/lib/cry/types";

export function CryResultPanel({ challengeNumber, score, squares, shareText }: { challengeNumber: number; score: number; squares: string[]; shareText: string }) {
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
  const perfect = score === CRY_ROUNDS;

  return (
    <section
      aria-live="polite"
      className={`relative mx-auto mt-5 max-w-md animate-fade-up overflow-hidden rounded-3xl border bg-gradient-to-b from-night-700 to-night-800 p-5 text-center ${
        perfect ? "border-sun-400/30 shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]" : "border-white/15"
      }`}
    >
      <p className="text-sm font-bold tracking-[0.15em] text-mist uppercase">PokéCry {formatChallengeNumber(challengeNumber)}</p>
      <p className={`mt-1 text-xl font-black tracking-tight ${perfect ? "animate-pop" : ""}`}>🎧 RESULTADO</p>
      <p className={`mt-1 text-5xl font-black tabular-nums ${perfect ? "text-sun-400" : score >= 3 ? "text-emerald-300" : "text-ember-300"}`}>
        {score}/{CRY_ROUNDS}
      </p>
      <p className="mt-2 text-2xl tracking-widest" aria-label={`${score} aciertos de ${CRY_ROUNDS}`}>
        {squares.join(" ")}
      </p>
      <p className="mt-1 text-sm text-mist">{perfect ? "¡Pleno! Oído de Maestro Pokémon." : score >= 3 ? "¡Buen oído!" : "Mañana, más cries."}</p>
      <AccentBar className="mt-4" />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={share}>{status === "copied" ? "✓ ¡Copiado!" : "Compartir resultado"}</Button>
        <ButtonLink href="/" variant="secondary">
          Volver a juegos
        </ButtonLink>
      </div>
      {status === "failed" && <p className="mt-3 text-xs text-ember-300">No se pudo compartir. Inténtalo de nuevo.</p>}
    </section>
  );
}
