import Image from "next/image";
import { TYPE_LABELS } from "@/lib/pokemon/labels-es";
import { parsePokemonType } from "@/lib/pokemon/type-names";

/** Rendered widths; the PNGs are 144×32 and always keep that 9:2 ratio (h-auto). */
const SIZES = {
  xs: "w-[63px]", // dense lists
  sm: "w-[72px]", // clues, tables
  md: "w-[90px]", // cards, results
  lg: "w-[117px]", // the type is the main condition
} as const;

/**
 * Official-style type badge from `public/png_types/<type>_type.png`.
 * Accepts the type however it is written; unknown values fall back to a plain
 * text chip instead of a broken image. Shrinks (never stretches) to fit narrow
 * containers thanks to `max-w-full`.
 */
export function PokemonTypeBadge({
  type,
  size = "md",
  alt,
  className = "",
}: {
  type: string;
  size?: keyof typeof SIZES;
  /** Accessible name; defaults to the Spanish type name. */
  alt?: string;
  className?: string;
}) {
  const known = parsePokemonType(type);
  if (!known) {
    return (
      <span className={`inline-block max-w-full rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] leading-tight font-bold text-mist ring-1 ring-white/10 ${className}`}>
        {alt ?? type}
      </span>
    );
  }
  return (
    <Image
      src={`/png_types/${known}_type.png`}
      alt={alt ?? TYPE_LABELS[known]}
      width={144}
      height={32}
      unoptimized
      draggable={false}
      className={`h-auto max-w-full shrink select-none ${SIZES[size]} ${className}`}
    />
  );
}
