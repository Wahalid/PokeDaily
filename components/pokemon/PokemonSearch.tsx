"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { formatDexNumber } from "@/lib/pokemon/format";
import { searchPokemon, type PokemonSearchIndex } from "@/lib/pokemon/search";
import type { PokemonSummary } from "@/lib/pokemon/types";
import { PokemonSprite } from "./PokemonSprite";
import { loadSearchIndex } from "./search-index-client";

/**
 * Reusable Pokémon autocomplete (name or Pokédex number).
 * Game-agnostic: the parent decides what selecting a Pokémon means.
 */
export function PokemonSearch({
  onSelect,
  usedIds = [],
  disabled = false,
  placeholder = "Search Pokémon...",
}: {
  onSelect: (pokemon: PokemonSummary) => void;
  usedIds?: readonly number[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const listId = useId();
  const [index, setIndex] = useState<PokemonSearchIndex | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  useEffect(() => {
    let alive = true;
    loadSearchIndex()
      .then((i) => alive && setIndex(i))
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => (index ? searchPokemon(index, query, 8) : []), [index, query]);

  const select = (pokemon: PokemonSummary | undefined) => {
    if (pokemon && !disabled) onSelect(pokemon);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(results[active]);
    }
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="relative">
        <SearchIcon />
        <input
          data-autofocus
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-white/10 bg-night-700 py-3 pr-4 pl-11 text-base text-white outline-none transition placeholder:text-mist-dim focus:border-brand-500 focus:bg-night-600 focus:ring-4 focus:ring-brand-500/25"
        />
      </div>

      <ul id={listId} role="listbox" className="mt-2 min-h-0 overflow-y-auto overscroll-contain">
        {results.map((p, i) => {
          const used = usedIds.includes(p.id);
          return (
            <li
              key={p.id}
              id={`${listId}-${p.id}`}
              role="option"
              aria-selected={i === active}
              // mousemove (not mouseenter): results re-rendering under a still
              // cursor must not change the keyboard selection.
              onMouseMove={() => i !== active && setActive(i)}
              onClick={() => select(p)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 transition ${
                i === active ? "bg-brand-500/15 ring-1 ring-brand-500/30" : ""
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <PokemonSprite src={p.sprite} name={p.name} size={44} className="shrink-0" />
              <span className="flex-1 truncate font-medium text-white">{p.name}</span>
              {used && <span className="text-[11px] font-semibold text-mist-dim uppercase">Used</span>}
              <span className="font-mono text-xs text-mist-dim tabular-nums">{formatDexNumber(p.dexNumber)}</span>
            </li>
          );
        })}
      </ul>

      <SearchHint loading={!index && !loadFailed} failed={loadFailed} query={query} empty={results.length === 0} />
    </div>
  );
}

function SearchHint({ loading, failed, query, empty }: { loading: boolean; failed: boolean; query: string; empty: boolean }) {
  let text: string | null = null;
  if (failed) text = "Couldn't load the Pokédex. Check your connection and reopen.";
  else if (loading) text = "Loading Pokédex…";
  else if (!query.trim()) text = "Type a name or a Pokédex number.";
  else if (empty) text = "No Pokémon found.";
  return text ? <p className="px-2 py-6 text-center text-sm text-mist-dim">{text}</p> : null;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist-dim"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" strokeLinecap="round" />
    </svg>
  );
}
