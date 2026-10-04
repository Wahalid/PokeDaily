import type { LetterState } from "@/lib/wordle/types";
import { STATE_CLASSES } from "./WordleBoard";

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

/** On-screen keyboard (used on every screen; the physical keyboard works too). */
export function WordleKeyboard({
  states,
  disabled,
  onLetter,
  onEnter,
  onBackspace,
}: {
  states: Record<string, LetterState>;
  disabled: boolean;
  onLetter: (letter: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
}) {
  const key =
    "grid h-12 min-w-0 place-items-center rounded-lg border text-sm font-bold uppercase transition select-none active:scale-95 disabled:opacity-60 sm:h-14 focus-visible:outline-2 focus-visible:outline-sun-400";
  return (
    <div aria-label="Teclado" className="mx-auto flex w-full max-w-lg flex-col gap-1.5">
      {ROWS.map((letters, r) => (
        <div key={r} className="flex justify-center gap-1 sm:gap-1.5">
          {r === 2 && (
            <button type="button" disabled={disabled} onClick={onEnter} className={`${key} flex-[1.6] border-sun-400/40 bg-sun-400/15 px-1 text-[11px] text-sun-300 sm:text-xs`}>
              Enviar
            </button>
          )}
          {[...letters].map((letter) => {
            const state = states[letter];
            return (
              <button
                key={letter}
                type="button"
                disabled={disabled}
                onClick={() => onLetter(letter)}
                aria-label={`${letter.toUpperCase()}${state ? ` (${state === "correct" ? "verde" : state === "present" ? "amarilla" : "gris"})` : ""}`}
                className={`${key} max-w-11 flex-1 ${state ? STATE_CLASSES[state] : "border-white/10 bg-night-600 text-white hover:bg-night-700"}`}
              >
                {letter}
              </button>
            );
          })}
          {r === 2 && (
            <button type="button" disabled={disabled} onClick={onBackspace} aria-label="Borrar" className={`${key} flex-[1.6] border-white/10 bg-night-600 text-lg text-white hover:bg-night-700`}>
              ⌫
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
