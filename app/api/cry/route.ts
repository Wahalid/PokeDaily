import { getCryAudio } from "@/lib/server/cry-service";
import { todayNumber } from "@/lib/server/test-day";

/**
 * Audio of one PokéCry round: /api/cry?day=<n>&round=<1-5>. The URL carries no
 * Pokémon id; future days and invalid rounds are refused.
 *
 * - A static route (query params, not /[day]/[round]): in `next dev`, every
 *   request to a dynamic segment spawns a "static paths" worker process, and
 *   Safari's several requests per audio file made those workers crash (500s).
 * - Byte ranges (206 Partial Content): Safari/iOS requires them for media and
 *   first probes with `Range: bytes=0-1`.
 */
async function serve(request: Request, withBody: boolean): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const audio = await getCryAudio(Number(params.get("day")), Number(params.get("round")), await todayNumber());
  if (!audio) return Response.json({ error: "Audio no disponible." }, { status: 404 });

  const size = audio.body.length;
  const headers: Record<string, string> = {
    "Content-Type": audio.type,
    "Accept-Ranges": "bytes",
    // Private: never shared by CDNs; the same day/round always returns the same cry.
    "Cache-Control": "private, max-age=86400",
    "X-Content-Type-Options": "nosniff",
  };

  const range = request.headers.get("range");
  const match = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
  if (range && !match) {
    return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
  }
  if (match) {
    let start: number, end: number;
    if (match[1] === "") {
      // Suffix range: the last N bytes.
      const suffix = Number(match[2]);
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    const chunk = audio.body.subarray(start, end + 1);
    return new Response(withBody ? new Uint8Array(chunk) : null, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(chunk.length) },
    });
  }
  return new Response(withBody ? new Uint8Array(audio.body) : null, { headers: { ...headers, "Content-Length": String(size) } });
}

export const GET = (request: Request) => serve(request, true);
export const HEAD = (request: Request) => serve(request, false);
