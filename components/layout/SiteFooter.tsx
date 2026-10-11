export function SiteFooter() {
  return (
    // relative z-10: stays above the hub's fixed landscape.
    <footer className="relative z-10 px-4 pt-10 pb-8 text-center text-xs text-white/60">
      PokeDaily is a fan project. Pokémon data from{" "}
      <a
        href="https://pokeapi.co"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-sm underline decoration-white/30 underline-offset-2 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400"
      >
        PokéAPI
      </a>
      . Pokémon © Nintendo / Game Freak / The Pokémon Company.
    </footer>
  );
}
