/**
 * Generates, audits and freezes daily PokéCry days into data/daily-challenges.json
 * (`cry` section, SEALED with a "cry" sub-key derived from GUESS_SECRET_KEY) and
 * prepares the audio of every answer:
 *
 *   PokéAPI cry (Ogg) → validated with ffprobe → converted to MP3 (plays on
 *   every browser, incl. iOS) → encrypted → data/cries/<opaque name>.bin
 *
 * A cry that can't be downloaded or decoded is marked unusable and the day is
 * regenerated without it. Requires ffmpeg/ffprobe on PATH.
 *
 *   npm run cry:freeze                         # #1–#60, skips frozen days
 *   npm run cry:freeze -- --from 61 --days 30  # extend the runway
 *   npm run cry:freeze -- --dry-run            # audit only (no audio, nothing written)
 *   npm run cry:freeze -- --reveal             # print answers (local console only!)
 *   npm run cry:freeze -- --prune              # delete audio no frozen day uses
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StoredChallenge } from "../lib/daily/challenge-store";
import { dateForChallengeNumber, formatChallengeNumber } from "../lib/daily/calendar";
import { generateDailyCry, type FrozenCry } from "../lib/cry/daily";
import { analyzeCry, CRY_VERSION, prepareCryData, similarity } from "../lib/cry/generator";
import { cryAudioName, crySourceUrl, deriveCryKey, openCry, openCryAudio, sealCry, sealCryAudio } from "../lib/cry/secret";
import type { CryChallenge } from "../lib/cry/types";
import { GUESS_KEY_ENV } from "../lib/guess/secret";
import { CHALLENGES_FILE, DATA_DIR, datasetFingerprint, loadChallengeFile, loadGuessKey, loadPokedex } from "./lib/load-data";

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}
const from = arg("from", 1);
const days = arg("days", 60);
const dryRun = process.argv.includes("--dry-run");
const reveal = process.argv.includes("--reveal");
const prune = process.argv.includes("--prune");

const platformKey = loadGuessKey();
if (!platformKey) {
  console.error(`✖ ${GUESS_KEY_ENV} is missing or invalid. Add it to .env.local (64 hex characters).`);
  process.exit(1);
}
const key = deriveCryKey(platformKey);
const pokedex = loadPokedex();
const data = prepareCryData(pokedex.all);
const dataset = datasetFingerprint();
const file = loadChallengeFile();
const frozen = (file.cry ??= {}) as Record<string, StoredChallenge<FrozenCry>>;

const CRIES_DIR = path.join(DATA_DIR, "cries");
const DOWNLOADS = path.join(process.cwd(), ".cache", "cries");
const BAD_FILE = path.join(DOWNLOADS, "unusable.json");
mkdirSync(CRIES_DIR, { recursive: true });
mkdirSync(DOWNLOADS, { recursive: true });
const unusable = new Map<number, string>(existsSync(BAD_FILE) ? Object.entries(JSON.parse(readFileSync(BAD_FILE, "utf8"))).map(([k, v]) => [Number(k), String(v)]) : []);

// ---- Audio preparation -----------------------------------------------------------

function duration(file: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], { encoding: "utf8" });
  return Number(out.trim());
}

async function download(id: number): Promise<string> {
  const target = path.join(DOWNLOADS, `${id}.ogg`);
  if (existsSync(target)) return target;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(crySourceUrl(id), { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeFileSync(target, Buffer.from(await res.arrayBuffer()));
      return target;
    } catch (error) {
      if (attempt === 3) throw error;
    }
  }
  throw new Error("unreachable");
}

let prepared = 0, reused = 0;
/** Makes sure the answer's cry is prepared. Returns an error message, or null when it's ready. */
async function prepareAudio(id: number): Promise<string | null> {
  const target = path.join(CRIES_DIR, cryAudioName(key, id));
  if (existsSync(target) && openCryAudio(readFileSync(target), id, key)) {
    reused++;
    return null;
  }
  try {
    const ogg = await download(id);
    const d = duration(ogg);
    if (!(d >= 0.2 && d <= 15)) return `bad duration ${d}`;
    const mp3 = path.join(DOWNLOADS, `${id}.mp3`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", ogg, "-ac", "1", "-ar", "44100", "-b:a", "64k", "-map_metadata", "-1", mp3]);
    const d2 = duration(mp3);
    if (!(d2 >= 0.2 && d2 <= 15)) return `bad converted duration ${d2}`;
    writeFileSync(target, sealCryAudio(readFileSync(mp3), id, key));
    prepared++;
    return null;
  } catch (error) {
    return (error as Error).message.split("\n")[0];
  }
}

// ---- Generate & freeze ----------------------------------------------------------------

const challenges = new Map<number, CryChallenge>();
for (const [n, entry] of Object.entries(frozen)) {
  const challenge = openCry(entry.payload.challenge, Number(n), key);
  if (!challenge) {
    console.error(`✖ Frozen PokéCry #${n} cannot be decrypted with this ${GUESS_KEY_ENV}. Wrong key?`);
    process.exit(1);
  }
  challenges.set(Number(n), challenge);
}

(async () => {
  let generated = 0, kept = 0, fallbacks = 0, regenerated = 0;
  const rejections: Record<string, number> = {};
  for (let number = from; number < from + days; number++) {
    if (frozen[String(number)]) {
      kept++;
      if (!dryRun) for (const r of challenges.get(number)!.rounds) await prepareAudio(r.answer);
      continue;
    }
    let result = generateDailyCry(number, { data, key, lookup: (n) => challenges.get(n) ?? null, hasCry: (id) => !unusable.has(id) });
    for (let tries = 0; !dryRun && tries < 20; tries++) {
      const failures: number[] = [];
      for (const r of result.challenge.rounds) {
        const error = await prepareAudio(r.answer);
        if (error) {
          unusable.set(r.answer, error);
          failures.push(r.answer);
        }
      }
      if (failures.length === 0) break;
      regenerated++;
      console.warn(`  ⚠ #${number}: unusable cry for ${failures.map((id) => data.byId.get(id)!.name).join(", ")} — regenerating the day`);
      result = generateDailyCry(number, { data, key, lookup: (n) => challenges.get(n) ?? null, hasCry: (id) => !unusable.has(id) });
    }
    const c = result.challenge;
    challenges.set(number, c);
    frozen[String(number)] = {
      number,
      date: dateForChallengeNumber(number),
      payload: {
        challenge: sealCry(c, number, key),
        generatorVersion: CRY_VERSION,
        fallbackStep: result.fallbackStep,
        dataset,
        salt: randomBytes(8).toString("hex"),
        frozenAt: new Date().toISOString(),
      },
    };
    generated++;
    if (result.fallbackStep > 0) fallbacks++;
    for (const [k, v] of Object.entries(result.rejections)) rejections[k] = (rejections[k] ?? 0) + v;
    const line = `${formatChallengeNumber(number)} ${dateForChallengeNumber(number)} · ${c.rounds.map((r) => r.difficulty[0].toUpperCase()).join("")} · score ${result.analysis.score.toFixed(2)}${result.fallbackStep ? ` · FALLBACK ${result.fallbackStep}` : ""}`;
    console.log(reveal ? `${line} · ${c.rounds.map((r) => data.byId.get(r.answer)!.name).join(", ")}` : line);
  }
  writeFileSync(BAD_FILE, JSON.stringify(Object.fromEntries(unusable), null, 2));

  // ---- Audit of the range --------------------------------------------------------------
  const range = [...challenges.entries()].filter(([n]) => n >= from && n < from + days).sort((a, b) => a[0] - b[0]);
  const answers = new Map<number, number>();
  const gens: Record<number, number> = {};
  const diffs: Record<string, number> = {};
  const sim: Record<string, number[]> = { easy: [], normal: [], hard: [] };
  const optionSets = new Set<string>();
  let invalid = 0, familyDistractors = 0, familiar = 0, repeatedRounds = 0, missingAudio = 0;
  const referenced = new Set<string>();
  for (const [, c] of range) {
    if (analyzeCry(c, data, (id) => !unusable.has(id)).problems.length) invalid++;
    for (const r of c.rounds) {
      const a = data.byId.get(r.answer)!;
      answers.set(r.answer, (answers.get(r.answer) ?? 0) + 1);
      gens[a.generation] = (gens[a.generation] ?? 0) + 1;
      diffs[r.difficulty] = (diffs[r.difficulty] ?? 0) + 1;
      const s = r.options.filter((id) => id !== r.answer).map((id) => similarity(a, data.byId.get(id)!));
      sim[r.difficulty].push(s.reduce((x, y) => x + y, 0) / s.length);
      if (r.options.some((id) => id !== r.answer && data.byId.get(id)!.evolution.chainId === a.evolution.chainId)) familyDistractors++;
      if (data.familiar.has(r.answer)) familiar++;
      const k = [...r.options].sort((x, y) => x - y).join();
      if (optionSets.has(k)) repeatedRounds++;
      optionSets.add(k);
      const name = cryAudioName(key, r.answer);
      referenced.add(name);
      const fileOk = existsSync(path.join(CRIES_DIR, name)) && !!openCryAudio(readFileSync(path.join(CRIES_DIR, name)), r.answer, key);
      if (!fileOk) missingAudio++;
    }
  }
  const avg = (xs: number[]) => (xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)).toFixed(2);
  const sorted = [...answers.entries()].sort((a, b) => b[1] - a[1]);
  const rounds = range.length * 5;
  console.log(`\nPokéCry v${CRY_VERSION} · generated ${generated}, kept ${kept}, fallbacks ${fallbacks}, days regenerated for audio ${regenerated}`);
  console.log(`Audit of #${from}–#${from + days - 1}: ${range.length} days · ${rounds} rounds · ${answers.size} distinct answers (${rounds - answers.size} repeats)`);
  console.log(`  invalid days ${invalid} · rounds without prepared audio ${dryRun ? "(dry run: not prepared)" : missingAudio} · unusable cries ${unusable.size} · repeated option sets ${repeatedRounds}`);
  console.log(`  generations ${JSON.stringify(gens)}`);
  console.log(`  difficulties ${JSON.stringify(diffs)} · familiar answers ${Math.round((familiar / Math.max(1, rounds)) * 100)}%`);
  console.log(`  distractor similarity (0 unrelated … 6 same family+type+gen): easy ${avg(sim.easy)} · normal ${avg(sim.normal)} · hard ${avg(sim.hard)} · rounds with a same-family distractor ${familyDistractors}`);
  console.log(`  most used answers ${sorted.slice(0, 5).map(([id, k]) => `${data.byId.get(id)!.name}×${k}`).join(", ")} · least used: ${sorted.filter(([, k]) => k === 1).length} answers used once`);
  console.log(`  rejected candidate days (this run): ${JSON.stringify(rejections)}`);
  if (!dryRun) console.log(`  audio: ${prepared} prepared now, ${reused} already prepared`);

  const orphans = readdirSync(CRIES_DIR).filter((f) => f.endsWith(".bin") && !referenced.has(f) && ![...challenges.values()].some((c) => c.rounds.some((r) => cryAudioName(key, r.answer) === f)));
  if (orphans.length) {
    console.log(`  ${orphans.length} audio files not used by any frozen day${prune ? " — deleted" : " (run with --prune to delete)"}`);
    if (prune && !dryRun) for (const f of orphans) rmSync(path.join(CRIES_DIR, f));
  }
  if (dryRun) {
    console.log("(dry run — nothing written)");
  } else {
    writeFileSync(CHALLENGES_FILE, JSON.stringify(file, null, 2) + "\n");
    console.log("✔ Saved to data/daily-challenges.json (days sealed) and data/cries/ (audio encrypted)");
  }
})();
