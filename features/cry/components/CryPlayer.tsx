"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RETRIES = 2;

/**
 * The round's audio player: big Play/Pause, progress bar, replay. Unlimited
 * listens. If the audio can't load it says so, offers retries and, as a last
 * resort, lets the parent void the round (never a silent round).
 */
export function CryPlayer({ src, round, onGiveUp }: { src: string; round: number; onGiveUp?: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [retries, setRetries] = useState(0);
  const url = retries ? `${src}?retry=${retries}` : src;

  // A new round (or a retry) starts from a clean state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
  }, [url]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || status === "error") return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended || audio.currentTime >= (audio.duration || Infinity)) audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setStatus("error");
    }
  };
  const replay = async () => {
    const audio = audioRef.current;
    if (!audio || status === "error") return;
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      setStatus("error");
    }
  };
  const retry = () => {
    setStatus("loading");
    setRetries((r) => r + 1);
  };

  return (
    <section
      aria-label={`Cry de la ronda ${round}`}
      className="relative overflow-hidden rounded-3xl border border-brand-500/40 bg-gradient-to-br from-night-700 via-night-800 to-night-800 p-5 text-center shadow-[0_20px_50px_-20px_rgb(8_17_43/0.9)]"
    >
      <span aria-hidden className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-sun-400/10 blur-3xl" />
      <audio
        ref={audioRef}
        src={url}
        preload="auto"
        onCanPlay={() => setStatus("ready")}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(1);
        }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setProgress(a.duration ? a.currentTime / a.duration : 0);
        }}
        onError={() => setStatus("error")}
      />
      {status === "error" ? (
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
            disabled={status === "loading"}
            aria-label={playing ? "Pausar el cry" : "Reproducir el cry"}
            className={`grid size-24 place-items-center rounded-full bg-sun-400 text-4xl text-night-950 shadow-[0_10px_30px_-8px_rgb(255_201_40/0.7)] transition hover:bg-sun-300 active:scale-95 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400 sm:size-28 ${
              playing ? "animate-pulse" : ""
            }`}
          >
            <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
          </button>
          <p className="mt-2 text-sm font-bold" aria-live="polite">
            {status === "loading" ? "Cargando sonido…" : playing ? "🔊 Sonando…" : "🔊 Pulsa para escuchar"}
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
            onClick={replay}
            disabled={status === "loading"}
            className="mt-3 rounded-full px-3 py-1 text-xs font-bold text-mist transition hover:bg-white/10 hover:text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sun-400"
          >
            ↺ Volver a escuchar
          </button>
        </div>
      )}
    </section>
  );
}
