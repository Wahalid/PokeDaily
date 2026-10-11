"use client";

import { useState } from "react";
import { Button, ButtonLink } from "./Button";

const COPY = {
  en: { share: "Share result", copied: "✓ Copied!", back: "Back to games", failed: "Couldn't share. Try again." },
  es: { share: "Compartir resultado", copied: "✓ ¡Copiado!", back: "Volver a los juegos", failed: "No se pudo compartir. Inténtalo de nuevo." },
} as const;

/**
 * Buttons at the bottom of a result panel: share (native sheet on touch
 * devices, clipboard elsewhere) and back to the games list.
 */
export function ResultActions({ lang, shareText }: { lang: keyof typeof COPY; shareText?: string }) {
  const copy = COPY[lang];
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  const share = async () => {
    if (!shareText) return;
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
    <>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {shareText && <Button onClick={share}>{status === "copied" ? copy.copied : copy.share}</Button>}
        <ButtonLink href="/" variant="secondary">
          {copy.back}
        </ButtonLink>
      </div>
      {status === "failed" && <p className="mt-3 text-xs text-ember-300">{copy.failed}</p>}
    </>
  );
}
