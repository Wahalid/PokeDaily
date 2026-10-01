# PokeDaily

Daily Pokémon games. V1 ships the **Pokémon Grid**; other games are listed as "coming soon".

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run update:pokemon` | Sync `data/pokemon.json` from PokéAPI (`-- --refresh` bypasses the raw cache in `.cache/`) |
| `npm run grid:freeze` | Generate + freeze daily grids into `data/daily-challenges.json` (default #1–#60; `-- --from 61 --days 30` to extend, `-- --dry-run` to preview, `-- --force` to rewrite frozen days) |
| `npm run grid:preview` | Read-only: print daily grids as the app would serve them (`-- --from 1 --days 30`) |
| `npm run verify` | Smoke tests for data, search, engine, generator and calendar |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |

## Architecture

```
PokéAPI ──(scripts/update-pokemon.ts)──▶ data/pokemon.json ──▶ lib/pokemon/repository.ts (server)
                                                                   │
                       lib/pokemon/search.ts ◀── /api/pokemon/search-index (static)
                       lib/grid/conditions ──▶ lib/grid/engine ──▶ lib/grid/generator
                                                                   │
                       lib/daily (calendar + challenge store) ──▶ lib/grid/daily ──▶ lib/server/grid-service
                                                                   │
                       app/grid/page.tsx ──▶ features/grid (UI + server action for validation)
```

- **Data** — `lib/pokemon/types.ts` is our model; PokéAPI shapes only exist in `scripts/pokeapi/`.
  Curated flags (starter, fossil, paradox, ultra beast) live in `scripts/pokeapi/curated.ts`.
  The app never calls PokéAPI at runtime (sprites are served from the PokéAPI sprites repo on GitHub).
- **Conditions** — `lib/grid/conditions/catalog.ts`. A condition is `{ id, category, label, test(pokemon) }`.
  Add a new attribute to the model → add a condition here; engine, generator and UI need no changes.
- **Generator (v2)** — `lib/grid/generator.ts`. Seeded rejection sampling: draw 3 rows + 3 columns
  (category weights, damped by recency), evaluate the 9 cells, accept the first candidate passing the
  quality rules in `lib/grid/quality.ts`:
  - *solvable*: ≥3 answers per cell; completable with 9 distinct Pokémon (bipartite matching)
  - *fair*: ≤1 broad condition (>25% of the Pokédex); no cell ≥80% contained (one condition ~implies
    the other); ≥2 answers from Gens 1–7 per cell; ≤1 stats/size condition
  - *balanced*: ≤1 very-hard cell, ≤1 very-easy cell, ≥3 normal/easy cells, grid score in [1.7, 2.4]
    (internal difficulty model in `lib/grid/difficulty.ts` — never shown to players)
  - *recency*: no condition from the previous 3 days, days 4–7 down-weighted, and no grid sharing
    4+ conditions with any grid of the last 30 days
  `generateGridSafe` never throws: it relaxes rules step by step, ending with a known-good `SAFE_GRID`.
  Bump `GENERATOR_VERSION` whenever generation output would change.
- **Daily** — challenge #1 is 2026-10-01; days roll over at 00:00 UTC. Grids are **frozen** in
  `data/daily-challenges.json` (conditions + generator version + seed + dataset fingerprint + answer
  counts + score) and served from there; unfrozen days are generated on the fly as a safety net.
  Keep the runway frozen (`npm run verify` warns when <14 days remain), and freeze before changing the
  generator, conditions or Pokémon data so history never changes.
- **Validation** — answers are checked by a server action, so correct answers are never sent to the client.
- **Progress/streaks** — localStorage (`lib/storage`), shared across games.
