import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Pokémon sprites referenced by our dataset (PokéAPI sprite repository).
    remotePatterns: [new URL("https://raw.githubusercontent.com/PokeAPI/sprites/**")],
  },
};

export default nextConfig;
