import type { GuessFeedback } from "@/lib/guess/types";
import { COLUMN_LABELS } from "../labels";
import { GuessRow } from "./GuessRow";

/** Previous guesses, newest first, under a column header (desktop). */
export function GuessBoard({ guesses, animateLatest }: { guesses: readonly GuessFeedback[]; animateLatest: boolean }) {
  if (guesses.length === 0) return null;
  const newestFirst = [...guesses].reverse();

  return (
    <section aria-label="Intentos" className="mt-6">
      <div
        aria-hidden
        className="mb-2 hidden grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-2 px-1 text-center text-[11px] font-bold tracking-wider text-mist-dim uppercase sm:grid"
      >
        {COLUMN_LABELS.map((label, i) => (
          <span key={label} className={i === 0 ? "text-left" : ""}>
            {label}
          </span>
        ))}
      </div>
      <ol className="flex flex-col gap-2.5 sm:gap-2">
        {newestFirst.map((feedback, i) => (
          <GuessRow key={feedback.pokemon.id} feedback={feedback} animate={animateLatest && i === 0} />
        ))}
      </ol>
    </section>
  );
}
