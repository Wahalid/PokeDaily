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
  experimental: {
    // Turbopack's persistent build cache (.next/cache/turbopack) records the
    // values of env vars read by server code — including GUESS_SECRET_KEY —
    // and Netlify ships that cache (.netlify/.next/cache), where its secrets
    // scanner rightly flags it. Disabling it keeps the secret out of every
    // build artifact; the key is still read from the environment at runtime.
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
