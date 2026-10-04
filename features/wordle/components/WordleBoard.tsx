import { MAX_ATTEMPTS, type LetterState, type WordleRow } from "@/lib/wordle/types";

export const STATE_CLASSES: Record<LetterState, string> = {
  correct: "border-emerald-400 bg-emerald-500 text-white",
  present: "border-sun-300 bg-sun-400 text-night-950",
  absent: "border-slate-500/40 bg-slate-600/80 text-white/85",
};

const STATE_LABELS: Record<LetterState, string> = { correct: "verde", present: "amarilla", absent: "gris" };

/** Classic Wordle board: MAX_ATTEMPTS rows × `length` tiles. */
export function WordleBoard({
  length,
  rows,
  current,
  playing,
  revealRow,
  shakeKey,
}: {
  length: number;
  rows: readonly WordleRow[];
  current: string;
  playing: boolean;
  /** Index of the row that was just submitted (animated flip). */
  revealRow: number | null;
  /** Changes when the current row must shake (rejected input). */
  shakeKey: number;
}) {
  const textSize = length >= 11 ? "text-sm sm:text-lg" : length >= 9 ? "text-base sm:text-xl" : "text-xl sm:text-2xl";
  const columns = { gridTemplateColumns: `repeat(${length}, minmax(0, 3.25rem))` };

  return (
    <div role="grid" aria-label="Tablero" className="flex flex-col items-center gap-1.5">
      {Array.from({ length: MAX_ATTEMPTS }, (_, r) => {
        const row = rows[r];
        const isCurrent = playing && r === rows.length;
        const letters = row ? row.word : isCurrent ? current : "";
        const label = row
          ? `Intento ${r + 1}: ${[...row.word].map((l, i) => `${l.toUpperCase()} ${STATE_LABELS[row.pattern[i]]}`).join(", ")}`
          : isCurrent
            ? `Intento actual: ${current.toUpperCase() || "vacío"}`
            : `Intento ${r + 1}: vacío`;
        return (
          <div
            key={isCurrent ? `current-${shakeKey}` : r}
            role="row"
            aria-label={label}
            className={`grid w-full justify-center gap-1 sm:gap-1.5 ${isCurrent && shakeKey > 0 ? "animate-shake" : ""}`}
            style={columns}
          >
            {Array.from({ length }, (_, i) => {
              const letter = letters[i] ?? "";
              const state = row?.pattern[i];
              const tone = state
                ? STATE_CLASSES[state]
                : letter
                  ? "border-white/35 bg-night-800 text-white"
                  : "border-white/10 bg-night-950/50 text-white";
              const animate = state && revealRow === r ? "animate-reveal" : !state && letter ? "animate-pop" : "";
              return (
                <span
                  key={state ? `s${i}` : `${i}-${letter}`}
                  role="gridcell"
                  aria-hidden
                  className={`grid aspect-square place-items-center rounded-lg border-2 font-black uppercase select-none ${textSize} ${tone} ${animate}`}
                  style={animate === "animate-reveal" ? { animationDelay: `${i * 90}ms` } : undefined}
                >
                  {letter}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
