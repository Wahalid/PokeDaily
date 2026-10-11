"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 2;

/**
 * The round's audio player: big Play/Pause, progress bar, replay. Unlimited
 * listens. If the audio can't load it says so, offers retries and, as a last
 * resort, lets the parent void the round (never a silent round).
 *
 * iOS/Safari notes: Safari doesn't preload media until the user taps, so Play
 * is never disabled while "loading" (tapping it is what starts the download);
 * only a real media error (the `error` event) or an unsupported source counts
 * as a failure — an interrupted or blocked play() is not a load error.
 */
export function CryPlayer({ src, round, onGiveUp }: { src: string; round: number; onGiveUp?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const [retries, setRetries] = useState(0);
  const url = retries ? `${src}&retry=${retries}` : src;

  // A new round (or a retry) starts from a clean element state.
  useEffect(() => {
    audioRef.current?.load();
  }, [url]);

  const start = async (fromStart: boolean) => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (fromStart || audio.ended) audio.currentTime = 0;
    setWaiting(true);
    try {
      await audio.play();
    } catch (error) {
      setWaiting(false);
      // NotSupportedError = the source can't be played; anything else (AbortError when a
      // new load interrupts, NotAllowedError) is not a broken file: the player can tap again.
      if ((error as Error)?.name === "NotSupportedError") setFailed(true);
    }
  };
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || failed) return;
    if (!audio.paused) audio.pause();
    else void start(false);
  };
  const retry = () => {
    setFailed(false);
    setWaiting(false);
    setProgress(0);
    setRetries((r) => r + 1);
  };

  return (
    <section
      aria-label={`Cry de la ronda ${round}`}
      className="panel relative overflow-hidden p-5 text-center"
    >
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-sun-400/10 blur-3xl" />
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onPlaying={() => {
          setWaiting(false);
          setPlaying(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPause={() => {
          setPlaying(false);
          setWaiting(false);
        }}
        onEnded={() => {
          setPlaying(false);
          setWaiting(false);
          setProgress(1);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
        onError={() => {
          setFailed(true);
          setPlaying(false);
          setWaiting(false);
        }}
      />
      {failed ? (
        <div className="relative">
          <p className="text-lg font-black text-ember-300">🔇 No se pudo cargar el sonido</p>
          <p className="mt-1 text-sm text-mist">Comprueba tu conexión e inténtalo de nuevo.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-sun-400 px-5 py-2.5 text-sm font-bold text-night-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
            >
              Reintentar
            </button>
            {retries >= MAX_RETRIES && onGiveUp && (
              <button
                type="button"
                onClick={onGiveUp}
                className="rounded-xl border border-white/15 bg-night-700 px-5 py-2.5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-sun-400"
              >
                Anular esta ronda
              </button>
            )}
          </div>
          {retries >= MAX_RETRIES && onGiveUp && <p className="mt-2 text-xs text-mist-dim">Una ronda anulada no suma ni resta: cuenta como ⬛.</p>}
        </div>
      ) : (
        <div className="relative flex flex-col items-center">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pausar el cry" : "Reproducir el cry"}
            className={`grid size-24 place-items-center rounded-full bg-sun-400 text-4xl text-night-950 shadow-[0_10px_30px_-8px_rgb(255_201_40/0.7)] transition hover:bg-sun-300 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400 sm:size-28 ${
              playing ? "animate-pulse" : ""
            }`}
          >
            <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
          </button>
          <p className="mt-2 text-sm font-bold" aria-live="polite">
            {waiting && !playing ? "Cargando sonido…" : playing ? "🔊 Sonando…" : "🔊 Pulsa para escuchar"}
          </p>
          <div
            role="progressbar"
            aria-label="Progreso del cry"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            className="mt-3 h-2 w-full max-w-xs overflow-hidden rounded-full bg-night-950/70"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 via-sun-400 to-ember-500 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
          </div>
          <button
            type="button"
            onClick={() => void start(true)}
            className="mt-2 inline-flex min-h-10 items-center rounded-full px-4 text-xs font-bold text-mist transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-sun-400"
          >
            ↺ Volver a escuchar
          </button>
        </div>
      )}
    </section>
  );
}
