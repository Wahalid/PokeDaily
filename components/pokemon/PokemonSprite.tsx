import Image from "next/image";

export function PokemonSprite({
  src,
  name,
  size = 48,
  className = "",
}: {
  src: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        style={{ width: size, height: size }}
        className={`grid place-items-center rounded-full bg-white/5 text-xs text-mist-dim ${className}`}
        aria-label={name}
      >
        ?
      </span>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      // Tiny pixel-art sprites: no need for the image optimizer.
      unoptimized
      className={`pixelated select-none ${className}`}
      draggable={false}
    />
  );
}
