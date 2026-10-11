import type { ReactNode } from "react";

/**
 * End-of-game panel shared by every game: the hub's card surface with a
 * yellow (win), red (loss) or neutral border. Content is centred.
 */
export function ResultPanel({
  tone,
  className = "",
  children,
}: {
  tone: "win" | "loss" | "neutral";
  className?: string;
  children: ReactNode;
}) {
  const border = tone === "win" ? "panel-win" : tone === "loss" ? "panel-loss" : "";
  return (
    <section aria-live="polite" className={`panel mx-auto max-w-md animate-fade-up p-5 text-center sm:p-6 ${border} ${className}`}>
      {children}
    </section>
  );
}
