import { PokemonSprite } from "@/components/pokemon/PokemonSprite";

export type CardLook =
  | { kind: "idle" }
  | { kind: "selected" }
  /** Confirmed correct by the help. */
  | { kind: "hinted" }
  /** After the game: what it really was, and whether the player got it right (null = not reached). */
  | { kind: "revealed"; impostor: boolean; right: boolean | null };

const LOOKS: Record<CardLook["kind"], string> = {
  idle: "border-white/10 bg-night-800/80 hover:border-white/25 hover:bg-night-700",
  selected: "border-sun-400 bg-sun-400/10 shadow-[0_0_0_1px_rgb(255_201_40/0.6),0_10px_24px_-12px_rgb(255_201_40/0.5)]",
  hinted: "border-emerald-400 bg-emerald-500/10",
  revealed: "",
};

/** A Pokémon card (sprite + name). Before the end it never shows whether it is an impostor. */
export function ImpostorCard({
  name,
  sprite,
  look,
  onClick,
  disabled,
  size = "md",
}: {
  name: string;
  sprite: string | null;
  look: CardLook;
  onClick?: () => void;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  const revealed = look.kind === "revealed" ? look : null;
  const tone = revealed
    ? revealed.impostor
      ? "border-ember-500/80 bg-ember-500/10"
      : "border-emerald-400/70 bg-emerald-500/10"
    : LOOKS[look.kind];
  const pressed = look.kind === "selected" || look.kind === "hinted";
  const content = (
    <>
      <PokemonSprite src={sprite} name="" size={96} className={size === "lg" ? "size-28 sm:size-32" : "size-16 sm:size-[4.5rem]"} />
      <span className={`mt-0.5 w-full truncate text-center font-bold ${size === "lg" ? "text-lg" : "text-xs sm:text-sm"}`}>{name}</span>
      {look.kind === "selected" && (
        <span aria-hidden className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-sun-400 text-[11px] font-black text-night-950">
          ✓
        </span>
      )}
      {look.kind === "hinted" && (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">💡 Correcto</span>
      )}
      {revealed && (
        <>
          <span
            className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black ${
              revealed.impostor ? "bg-ember-500 text-white" : "bg-emerald-500 text-white"
            }`}
          >
            {revealed.impostor ? "🚨 Impostor" : "✓ Correcto"}
          </span>
          {revealed.right !== null && (
            <span
              aria-label={revealed.right ? "Acertaste" : "Fallaste"}
              className={`absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full text-[11px] font-black ${
                revealed.right ? "bg-white/90 text-emerald-600" : "bg-white/90 text-ember-600"
              }`}
            >
              {revealed.right ? "✓" : "✗"}
            </span>
          )}
        </>
      )}
    </>
  );
  const base = `relative flex flex-col items-center rounded-2xl border-2 px-1.5 pt-5 pb-2 transition ${tone}`;
  if (!onClick) return <div className={base}>{content}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={`${name}${look.kind === "hinted" ? " (confirmado como correcto)" : ""}`}
      className={`${base} active:scale-[0.97] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400`}
    >
      {content}
    </button>
  );
}
