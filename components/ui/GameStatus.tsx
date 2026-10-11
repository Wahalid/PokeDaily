export type StatusTone = "good" | "bad" | "info";
export type StatusMessage = { text: string; tone: StatusTone; key: number };

const tones: Record<StatusTone, string> = {
  good: "bg-emerald-500/15 text-emerald-300",
  bad: "animate-shake bg-ember-500/15 text-ember-300",
  info: "bg-white/10 text-mist",
};

/**
 * One-line feedback under a board ("¡Correcto!", "No encaja…"), announced to
 * screen readers. Keeps its height when empty so the board doesn't jump.
 */
export function GameStatus({
  message,
  pending = false,
  className = "",
}: {
  message: StatusMessage | null;
  /** Shows "Comprobando…" while a server check is running. */
  pending?: boolean;
  className?: string;
}) {
  return (
    <p aria-live="polite" className={`min-h-7 text-center text-sm font-bold ${className}`}>
      {pending ? (
        <span className="text-xs text-mist-dim">Comprobando…</span>
      ) : (
        message && (
          <span key={message.key} className={`inline-block animate-fade-up rounded-full px-3 py-0.5 ${tones[message.tone]}`}>
            {message.text}
          </span>
        )
      )}
    </p>
  );
}
