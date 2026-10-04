import { getCryAudio } from "@/lib/server/cry-service";

/**
 * Audio of one PokéCry round: /api/cry/<day>/<round>. The URL carries no
 * Pokémon id; future days and invalid rounds are refused.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ day: string; round: string }> }) {
  const { day, round } = await params;
  const audio = await getCryAudio(Number(day), Number(round));
  if (!audio) return Response.json({ error: "Audio no disponible." }, { status: 404 });
  return new Response(new Uint8Array(audio.body), {
    headers: {
      "Content-Type": audio.type,
      "Content-Length": String(audio.body.length),
      // Private: never shared by CDNs; the same day/round always returns the same cry.
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
