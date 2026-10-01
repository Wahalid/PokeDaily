import { getPokedex } from "@/lib/pokemon/repository";

// Built once at build time from our local database; never hits PokéAPI.
export const dynamic = "force-static";

export function GET() {
  return Response.json(getPokedex().summaries(), {
    headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
