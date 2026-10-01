import type { Pokemon, PokemonDataset, PokemonSummary } from "./types";

/**
 * In-memory query layer over the Pokémon dataset.
 * Pure (no I/O) so it can be used by the app, scripts and tests alike.
 */
export class Pokedex {
  readonly all: readonly Pokemon[];
  private readonly byId: Map<number, Pokemon>;

  constructor(dataset: PokemonDataset) {
    this.all = [...dataset.pokemon].sort((a, b) => a.dexNumber - b.dexNumber);
    this.byId = new Map(this.all.map((p) => [p.id, p]));
  }

  get size(): number {
    return this.all.length;
  }

  getById(id: number): Pokemon | undefined {
    return this.byId.get(id);
  }

  filter(predicate: (p: Pokemon) => boolean): Pokemon[] {
    return this.all.filter(predicate);
  }

  summaries(): PokemonSummary[] {
    return this.all.map(toSummary);
  }
}

export function toSummary(p: Pokemon): PokemonSummary {
  return { id: p.id, dexNumber: p.dexNumber, name: p.name, sprite: p.sprites.default };
}
