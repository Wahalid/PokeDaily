import type { ReactNode } from "react";

/** Small rounded counter shown above a board ("3/16", "Descartes: 2"). Same height as the buttons beside it. */
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 items-center rounded-full bg-night-800/80 px-3.5 text-mist ring-1 ring-brand-500/25">
      {/* Inner span keeps normal text flow, so "Descartes: 2" keeps its space. */}
      <span>{children}</span>
    </span>
  );
}
