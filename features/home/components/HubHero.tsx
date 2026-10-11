export function HubHero({ dateLabel }: { dateLabel: string }) {
  return (
    <section className="text-center">
      <p className="-mr-[0.2em] text-xs font-bold tracking-[0.2em] text-lavender uppercase">
        PokéDaily <span aria-hidden>·</span> {dateLabel}
      </p>
      <h1 className="mt-3 text-4xl leading-[1.05] font-black tracking-tight text-balance [text-shadow:0_3px_0_rgb(5_9_22/0.55)] sm:text-5xl lg:text-[3.5rem]">
        Daily <span className="text-sun-400">Pokémon</span> games
      </h1>
    </section>
  );
}
