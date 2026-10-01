"use client";

import { useState } from "react";
import { AccentBar } from "@/components/ui/AccentBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CELL_COUNT } from "@/lib/grid/types";

export function GridComplete({
  filledCount,
  streak,
  shareText,
}: {
  filledCount: number;
  streak: number;
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
      className="relative mx-auto mt-8 max-w-md animate-fade-up overflow-hidden rounded-3xl border border-sun-400/30 bg-gradient-to-b from-night-700 to-night-800 p-6 text-center shadow-[0_20px_60px_-20px_rgb(255_201_40/0.35)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 size-56 -translate-x-1/2 rounded-full bg-sun-400/15 blur-3xl"
      />
      <div className="relative">
        <p className="text-2xl font-black tracking-tight">🎉 GRID COMPLETE!</p>
        <p className="mt-2 text-5xl font-black text-sun-400 tabular-nums">
          {filledCount} / {CELL_COUNT}
        </p>
        {streak > 0 && <p className="mt-2 font-semibold text-ember-300">🔥 {streak} day streak</p>}
        <AccentBar className="mt-4" />
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={share}>{status === "copied" ? "✓ Copied!" : "Share result"}</Button>
          <ButtonLink href="/" variant="secondary">
            Back to games
          </ButtonLink>
        </div>
        {status === "failed" && <p className="mt-3 text-xs text-ember-300">Couldn&apos;t share. Try again.</p>}
      </div>
    </section>
  );
}
