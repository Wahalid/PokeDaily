"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { BOARD_SIZE } from "@/lib/impostor/types";

export function ImpostorResult({
  won,
  category,
  score,
  correctFound,
  correctTotal,
  impostorNames,
  shareText,
}: {
  won: boolean;
  category: string;
  score: number;
  correctFound: number;
  correctTotal: number;
  impostorNames: string[];
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
      <p className={`text-xl font-black tracking-tight sm:text-2xl ${won ? "animate-pop" : ""}`}>
        {won ? "🎉 ¡HAS ENCONTRADO A LOS IMPOSTORES!" : "💀 ¡CAÍSTE EN LA TRAMPA!"}
      </p>
      <p className="mt-2 text-xs font-bold tracking-wider text-mist uppercase">Categoría</p>
      <p className="font-bold text-sun-300">{category}</p>
      <p className={`mt-2 text-4xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {score}/{BOARD_SIZE}
      </p>
      <p className="text-sm text-mist">
        {won ? (
          <>Encontraste los {correctTotal} correctos sin caer en ningún impostor.</>
        ) : (
          <>
            Correctos encontrados: <strong className="text-white">{correctFound}</strong>/{correctTotal}
          </>
        )}
      </p>
      {!won && (
        <p className="mt-2 text-sm text-mist">
          Impostores: <strong className="text-ember-300">{impostorNames.join(", ")}</strong>
        </p>
      )}
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
