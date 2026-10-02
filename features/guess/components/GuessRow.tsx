import type { CSSProperties, ReactNode } from "react";
import { PokemonSprite } from "@/components/pokemon/PokemonSprite";
import type { GuessFeedback } from "@/lib/guess/types";
import { formatDexNumber } from "@/lib/pokemon/format";
import { COLOR_LABELS, COLUMN_LABELS, generationLabel, PHASE_LABELS, TYPE_LABELS } from "../labels";

type Status = "match" | "partial" | "miss";

const STATUS_STYLES: Record<Status, string> = {
  match: "border-emerald-400/50 bg-emerald-500/20 text-emerald-100",
  partial: "border-sun-400/50 bg-sun-400/15 text-sun-100",
  miss: "border-ember-500/40 bg-ember-500/15 text-ember-100",
};

/** One guess: Pokémon | Tipos | Generación | Fase | Color | Pokédex. */
export function GuessRow({ feedback, animate }: { feedback: GuessFeedback; animate: boolean }) {
  const { pokemon, types, generation, phase, color, dex } = feedback;
  const typeMatches = types.filter((t) => t.match).length;
  const typeStatus: Status = typeMatches === types.length ? "match" : typeMatches > 0 ? "partial" : "miss";
  const dexArrow = dex.direction === "higher" ? "⬆️" : dex.direction === "lower" ? "⬇️" : "🟩";
  const dexLabel = dex.direction === "higher" ? "más alto" : dex.direction === "lower" ? "más bajo" : "correcto";

  // Staggered reveal: tiles flip in one after another for a freshly added guess.
  const delay = (i: number): CSSProperties | undefined => (animate ? { animationDelay: `${i * 110}ms` } : undefined);
  const reveal = animate ? "animate-reveal" : "";

  return (
    <li
      className={`grid grid-cols-5 gap-1.5 rounded-2xl border p-2 sm:grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 ${
        feedback.correct ? "border-emerald-400/40 bg-emerald-500/5" : "border-white/10 bg-night-800/60"
      }`}
    >
      {/* Pokémon */}
      <div
        className={`col-span-5 flex items-center gap-2 rounded-xl sm:col-span-1 sm:border sm:px-2 sm:py-1.5 ${
          feedback.correct ? "sm:border-emerald-400/50 sm:bg-emerald-500/15" : "sm:border-white/10 sm:bg-night-800"
        }`}
      >
        <PokemonSprite src={pokemon.sprite} name={pokemon.name} size={48} className="size-10 shrink-0 sm:size-12" />
        <span className="min-w-0 truncate font-bold">{pokemon.name}</span>
        {feedback.correct && <span className="ml-auto text-sm sm:hidden">🎉</span>}
      </div>

      <Tile label={COLUMN_LABELS[1]} status={typeStatus} className={reveal} style={delay(0)}>
        <span className="flex flex-col items-center gap-0.5">
          {types.map((t) => (
            <span key={t.type} className="flex items-center gap-1 whitespace-nowrap">
              <span aria-hidden className="text-[9px] sm:text-[11px]">{t.match ? "🟩" : "❌"}</span>
              {TYPE_LABELS[t.type]}
              <span className="sr-only">{t.match ? "(coincide)" : "(no coincide)"}</span>
            </span>
          ))}
        </span>
      </Tile>
      <Tile label={COLUMN_LABELS[2]} status={generation.match ? "match" : "miss"} className={reveal} style={delay(1)}>
        {generationLabel(generation.value)}
      </Tile>
      <Tile label={COLUMN_LABELS[3]} status={phase.match ? "match" : "miss"} className={reveal} style={delay(2)}>
        {PHASE_LABELS[phase.value]}
      </Tile>
      <Tile label={COLUMN_LABELS[4]} status={color.match ? "match" : "miss"} className={reveal} style={delay(3)}>
        <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full ring-1 ring-white/40"
            style={{ backgroundColor: COLOR_LABELS[color.value].swatch }}
          />
          {COLOR_LABELS[color.value].label}
        </span>
      </Tile>
      <Tile label={COLUMN_LABELS[5]} status={dex.direction === "match" ? "match" : "miss"} className={reveal} style={delay(4)}>
        <span className="flex flex-col items-center leading-tight">
          <span className="font-mono tabular-nums">{formatDexNumber(dex.value)}</span>
          <span aria-hidden className="text-sm">{dexArrow}</span>
          <span className="sr-only">El número del Pokémon secreto es {dexLabel}</span>
        </span>
      </Tile>
    </li>
  );
}

function Tile({
  label,
  status,
  className = "",
  style,
  children,
}: {
  label: string;
  status: Status;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={style}
      className={`flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-center text-[10px] leading-tight font-semibold sm:min-h-14 sm:text-xs ${STATUS_STYLES[status]} ${className}`}
    >
      {/* Column captions only on phones; desktop has a header row. */}
      <span className="text-[8px] font-bold tracking-wider text-white/60 uppercase sm:hidden">{label}</span>
      <span className="sr-only">
        {label}: {status === "match" ? "coincide" : status === "partial" ? "coincide en parte" : "no coincide"}
      </span>
      {children}
    </div>
  );
}
