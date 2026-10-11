"use client";

import { useState, useTransition } from "react";
import { PokemonSearch } from "@/components/pokemon/PokemonSearch";
import { PokemonTypeBadge } from "@/components/pokemon/PokemonTypeBadge";
import { Dialog, DialogClose } from "@/components/ui/Dialog";
import type { ConditionView } from "@/lib/grid/conditions/types";
import type { AnswerRejection, AnswerResult } from "@/lib/grid/types";
import type { PokemonSummary } from "@/lib/pokemon/types";

/**
 * Player-facing copy for rejected answers. Deliberately hint-free: an
 * incorrect answer never reveals which condition failed.
 */
const REJECTION_COPY: Record<AnswerRejection, string> = {
  incorrect: "Not valid for this cell",
  "already-used": "This Pokémon has already been used.",
  "unknown-pokemon": "Unknown Pokémon. Try another one.",
  "invalid-cell": "Something went wrong. Please try again.",
};

export function AnswerDialog({
  row,
  column,
  usedIds,
  onClose,
  onAnswer,
}: {
  row: ConditionView;
  column: ConditionView;
  usedIds: readonly number[];
  onClose: () => void;
  onAnswer: (pokemon: PokemonSummary) => Promise<AnswerResult>;
}) {
  const [error, setError] = useState<{ message: string; key: number } | null>(null);
  const [pending, startTransition] = useTransition();

  const showError = (message: string) => setError({ message, key: Date.now() });

  const choose = (pokemon: PokemonSummary) => {
    if (usedIds.includes(pokemon.id)) {
      showError(REJECTION_COPY["already-used"]);
      return;
    }
    startTransition(async () => {
      try {
        const result = await onAnswer(pokemon);
        if (!result.ok) showError(REJECTION_COPY[result.reason]);
      } catch {
        showError(REJECTION_COPY["invalid-cell"]);
      }
    });
  };

  return (
    <Dialog open onClose={onClose} title={`Choose a Pokémon for ${row.label} and ${column.label}`}>
      <div className="mt-1 mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-mist-dim uppercase">Find a Pokémon that is</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-base font-bold">
            <ConditionChip condition={row} className="bg-brand-500/15 text-brand-300 ring-brand-500/30" />
            <span className="text-mist-dim">+</span>
            <ConditionChip condition={column} className="bg-sun-400/15 text-sun-300 ring-sun-400/30" />
          </p>
        </div>
        <DialogClose onClose={onClose} label="Close" />
      </div>

      {error && (
        <p
          key={error.key}
          role="alert"
          className="mb-3 flex animate-shake items-center gap-2 rounded-xl border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm font-semibold text-ember-300"
        >
          <span aria-hidden>❌</span>
          {error.message}
        </p>
      )}

      <PokemonSearch onSelect={choose} usedIds={usedIds} disabled={pending} />

      {pending && <p className="pt-2 text-center text-xs text-mist-dim">Checking…</p>}
    </Dialog>
  );
}

/** A condition in the dialog header: the type badge for type conditions, a tinted chip otherwise. */
function ConditionChip({ condition, className }: { condition: ConditionView; className: string }) {
  const type = condition.meta?.pokemonType as string | undefined;
  if (type) return <PokemonTypeBadge type={type} alt={condition.label} />;
  return <span className={`rounded-lg px-2 py-0.5 ring-1 ${className}`}>{condition.label}</span>;
}
