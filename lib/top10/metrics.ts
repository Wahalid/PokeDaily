import type { Pokemon } from "@/lib/pokemon/types";
import type { Direction } from "./types";

/**
 * Ranking metrics for Top 10 — only fields that exist for every base species
 * in data/pokemon.json (verified: no missing or zero values).
 *
 * Tie rule (documented in the UI): a higher value ranks higher ("desc") or a
 * lower value ranks higher ("asc"); on equal values the LOWER Pokédex number
 * ranks first. The generator rejects any ranking whose 10th and 11th entries
 * tie, so membership of the Top 10 never depends on the tie-break.
 *
 * Difficulty (0 easy … 2 hard) and weight steer the generator towards
 * intuitive questions ("the heaviest", "the fastest") and keep technical
 * stats (Sp. Atk / Sp. Def) rare.
 */
export interface MetricVariant {
  /** 0 easy · 1 normal · 2 hard. */
  difficulty: number;
  /** Relative selection weight. */
  weight: number;
  /** Phrase used in the title, e.g. "más pesados", "con más PS". */
  phrase: string;
}

export interface Metric {
  id: string;
  /** Spanish label, e.g. "Peso", "Ataque base". */
  label: string;
  get: (p: Pokemon) => number;
  format: (value: number) => string;
  directions: Partial<Record<Direction, MetricVariant>>;
}

const plain = (v: number) => String(v);
const decimal = (v: number) => (v / 10).toLocaleString("es-ES", { maximumFractionDigits: 1 });

export const METRICS: readonly Metric[] = [
  // Easy / accessible
  {
    id: "weight",
    label: "Peso",
    get: (p) => p.weight,
    format: (v) => `${decimal(v)} kg`,
    directions: { desc: { difficulty: 0, weight: 3, phrase: "más pesados" }, asc: { difficulty: 0.5, weight: 1.5, phrase: "más ligeros" } },
  },
  {
    id: "height",
    label: "Altura",
    get: (p) => p.height,
    format: (v) => `${decimal(v)} m`,
    directions: { desc: { difficulty: 0, weight: 3, phrase: "más altos" }, asc: { difficulty: 0.5, weight: 1.5, phrase: "más bajos" } },
  },
  { id: "speed", label: "Velocidad base", get: (p) => p.stats.speed, format: plain, directions: { desc: { difficulty: 0, weight: 3, phrase: "más rápidos" } } },
  { id: "hp", label: "PS base", get: (p) => p.stats.hp, format: plain, directions: { desc: { difficulty: 0, weight: 3, phrase: "con más PS" } } },
  // Normal
  { id: "attack", label: "Ataque base", get: (p) => p.stats.attack, format: plain, directions: { desc: { difficulty: 1, weight: 1.5, phrase: "con mayor Ataque" } } },
  { id: "defense", label: "Defensa base", get: (p) => p.stats.defense, format: plain, directions: { desc: { difficulty: 1, weight: 1.5, phrase: "con mayor Defensa" } } },
  {
    id: "total",
    label: "Total de estadísticas base",
    get: (p) => p.stats.total,
    format: plain,
    directions: { desc: { difficulty: 1, weight: 1.5, phrase: "con mayor total de estadísticas base" } },
  },
  // Hard — kept, but rare
  {
    id: "specialAttack",
    label: "Ataque Especial base",
    get: (p) => p.stats.specialAttack,
    format: plain,
    directions: { desc: { difficulty: 2, weight: 0.4, phrase: "con mayor Ataque Especial" } },
  },
  {
    id: "specialDefense",
    label: "Defensa Especial base",
    get: (p) => p.stats.specialDefense,
    format: plain,
    directions: { desc: { difficulty: 2, weight: 0.25, phrase: "con mayor Defensa Especial" } },
  },
];

const byId = new Map(METRICS.map((m) => [m.id, m]));
export const getMetric = (id: string) => byId.get(id);

export const DIRECTION_LABELS: Record<Direction, string> = { desc: "de mayor a menor", asc: "de menor a mayor" };

/** Deterministic ranking of `pokemon` by metric, with the documented tie rule. */
export function rankPokemon(pokemon: readonly Pokemon[], metric: Metric, direction: Direction): Array<{ pokemon: Pokemon; value: number }> {
  return pokemon
    .map((p) => ({ pokemon: p, value: metric.get(p) }))
    .sort((a, b) => (direction === "desc" ? b.value - a.value : a.value - b.value) || a.pokemon.dexNumber - b.pokemon.dexNumber);
}
