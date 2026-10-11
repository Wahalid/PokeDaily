import Image from "next/image";
import { clauseImageSrc } from "@/lib/pokemon/clause-images";

/** Rendered widths, matching PokemonTypeBadge; the PNGs are 576×128 and keep that 9:2 ratio (h-auto). */
const SIZES = {
  xs: "w-[63px]",
  sm: "w-[72px]",
  md: "w-[90px]",
  lg: "w-[117px]",
} as const;

/**
 * Badge from public/pokemon_grid_clauses/ for a condition (Grid, Bingo, Groups,
 * Impostor ids; see lib/pokemon/clause-images.ts). Renders nothing when the
 * condition has no badge, so callers keep their text label (`hasClauseBadge`).
 * Pass `size`, or omit it and set the width in `className`.
 */
export function ClauseBadge({
  id,
  alt,
  size,
  className = "",
}: {
  id: string;
  /** Accessible name: the condition as players read it in that game. */
  alt: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const src = clauseImageSrc(id);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={576}
      height={128}
      unoptimized
      draggable={false}
      className={`h-auto max-w-full shrink select-none ${size ? SIZES[size] : ""} ${className}`}
    />
  );
}

export const hasClauseBadge = (id: string) => clauseImageSrc(id) !== null;
