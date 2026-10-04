"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { keyboardStates } from "@/lib/wordle/compare";
import { MAX_ATTEMPTS, type WordlePublicState } from "@/lib/wordle/types";
import { normalizeName } from "@/lib/wordle/words";
import { submitWordleGuess } from "../actions";
import { recordWordleResult, useWordleProgress, useWordleStats } from "../progress";
import { buildWordleShareText } from "../share";
import { WordleBoard } from "./WordleBoard";
import { WordleHelpDialog, WordleStatsDialog } from "./WordleDialogs";
import { WordleKeyboard } from "./WordleKeyboard";
import { WordleResult } from "./WordleResult";

type Message = { text: string; key: number };

/** Interactive daily PokéWordle: board + keyboard (on-screen and physical) + result. */
export function WordleGame({
  challengeNumber,
  progressKey,
  initialState,
}: {
  challengeNumber: number;
  progressKey: string;
  initialState: WordlePublicState;
}) {
  const { guesses, state, save } = useWordleProgress(challengeNumber, progressKey, initialState);
  const stats = useWordleStats(challengeNumber);
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [revealRow, setRevealRow] = useState<number | null>(null);
  const [dialog, setDialog] = useState<"help" | "stats" | null>(null);
  const [pending, startTransition] = useTransition();

  const playing = state.status === "playing";
  const inputDisabled = !playing || pending;
  // Incrementing key restarts the message animation even when the text repeats.
  const say = (text: string) => setMessage((prev) => ({ text, key: (prev?.key ?? 0) + 1 }));

  const addLetter = (letter: string) => {
    if (inputDisabled) return;
    setCurrent((c) => (c.length < state.length ? c + letter : c));
  };
  const backspace = () => {
    if (!inputDisabled) setCurrent((c) => c.slice(0, -1));
  };
  const submit = () => {
    if (inputDisabled || current.length === 0) return;
    const word = normalizeName(current);
    startTransition(async () => {
      const nextGuesses = [...guesses, word];
      const result = await submitWordleGuess({ challengeNumber, guesses: nextGuesses }).catch(() => null);
      if (!result || !result.ok) {
        say(result?.message ?? "Algo ha fallado. Inténtalo de nuevo.");
        setShakeKey((k) => k + 1);
        return;
      }
      save(nextGuesses, result.state);
      setCurrent("");
      setMessage(null);
      setRevealRow(result.state.rows.length - 1);
      if (result.state.status !== "playing") {
        recordWordleResult(challengeNumber, result.state.status === "won", result.state.rows.length);
      }
    });
  };

  // Physical keyboard: A–Z (accents normalized), Backspace, Enter.
  useEffect(() => {
    if (dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key.length === 1) {
        const letter = normalizeName(e.key);
        if (/^[a-z]$/.test(letter)) addLetter(letter);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex justify-center gap-2">
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setDialog("help")}>
          <span aria-hidden>?</span> Ayuda
        </Button>
        <Button variant="ghost" className="px-3 py-1.5" onClick={() => setDialog("stats")}>
          <span aria-hidden>▤</span> Estadísticas
        </Button>
      </div>

      <p className="mt-1 text-center text-xs font-semibold text-mist">
        <span className="text-white tabular-nums">{state.length}</span> letras ·{" "}
        <span className="text-white tabular-nums">{state.rows.length}</span>/{MAX_ATTEMPTS} intentos
      </p>

      <div className="mt-3">
        <WordleBoard
          length={state.length}
          rows={state.rows}
          current={current}
          playing={playing}
          revealRow={revealRow}
          shakeKey={shakeKey}
        />
      </div>

      <p aria-live="polite" className="mt-2 min-h-7 text-center text-sm font-bold">
        {pending ? (
          <span className="text-xs text-mist-dim">Comprobando…</span>
        ) : (
          message && (
            <span key={message.key} className="inline-block animate-fade-up rounded-full bg-ember-500/15 px-3 py-0.5 text-ember-300">
              {message.text}
            </span>
          )
        )}
      </p>

      <div className="mt-1">
        {playing ? (
          <WordleKeyboard
            states={keyboardStates(state.rows)}
            disabled={inputDisabled}
            onLetter={addLetter}
            onEnter={submit}
            onBackspace={backspace}
          />
        ) : (
          <WordleResult
            won={state.status === "won"}
            attempts={state.rows.length}
            answer={state.answer}
            shareText={buildWordleShareText({ challengeNumber, rows: state.rows, won: state.status === "won" })}
          />
        )}
      </div>

      <WordleHelpDialog open={dialog === "help"} onClose={() => setDialog(null)} />
      <WordleStatsDialog open={dialog === "stats"} onClose={() => setDialog(null)} stats={stats} />
    </div>
  );
}
