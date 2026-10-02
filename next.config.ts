import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server only: allow opening the site from other devices on the home
  // network (e.g. http://192.168.1.5:3000 on a phone). Without this, Next.js
  // blocks its dev scripts for non-localhost origins, so the page renders but
  // never hydrates. Has no effect on production builds.
  allowedDevOrigins: ["192.168.*.*"],
  images: {
    // Pokémon sprites referenced by our dataset (PokéAPI sprite repository).
    remotePatterns: [new URL("https://raw.githubusercontent.com/PokeAPI/sprites/**")],
  },
};

export default nextConfig;
