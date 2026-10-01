import { AccentBar } from "@/components/ui/AccentBar";

export function HubHero({ dateLabel }: { dateLabel: string }) {
  return (
    <section className="text-center">
      <p className="text-xs font-bold tracking-[0.2em] text-sun-400 uppercase">
        PokeDaily <span className="text-mist-dim">·</span> <span className="text-mist">{dateLabel}</span>
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-balance sm:text-5xl lg:text-6xl">
        Daily <span className="text-sun-400">Pokémon</span> games
      </h1>
      <p className="mx-auto mt-3 max-w-md text-base text-pretty text-mist sm:text-lg">
        New puzzle every day. Same challenge for everyone.
      </p>
      <AccentBar className="mt-6" />
    </section>
  );
}

