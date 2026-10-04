"use client";

import { useState } from "react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { MAX_ATTEMPTS } from "@/lib/wordle/types";

export function WordleResult({
  won,
  attempts,
  answer,
  shareText,
}: {
  won: boolean;
  attempts: number;
  answer: { name: string; sprites: string[] } | undefined;
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
      className={`relative mx-auto max-w-md animate-fade-up overflow-hidden rounded-3xl border bg-gradient-to-b from-night-700 to-night-800 p-5 text-center ${
        won ? "border-sun-400/30 shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]" : "border-ember-500/30"
      }`}
    >
      <p className={`text-xl font-black tracking-tight sm:text-2xl ${won ? "animate-pop" : ""}`}>
        {won ? "🎉 ¡POKÉMON ENCONTRADO!" : "😔 ¡Se acabaron los intentos!"}
      </p>
      {!won && <p className="mt-1 text-sm font-semibold text-mist">El Pokémon era:</p>}
      {answer && (
        <div className="mt-2 flex flex-col items-center">
          <div className="flex">
            {answer.sprites.map((src) => (
              <PokemonSprite key={src} src={src} name={answer.name} size={96} className="size-24" />
            ))}
          </div>
          <p className="text-2xl font-black text-brand-300">{answer.name}</p>
        </div>
      )}
      <p className={`mt-1 text-4xl font-black tabular-nums ${won ? "text-sun-400" : "text-ember-300"}`}>
        {attempts}/{MAX_ATTEMPTS}
      </p>
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
