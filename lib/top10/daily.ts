import type { SealedBox } from "@/lib/crypto/sealed";
import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import type { QuartetsData } from "@/lib/quartets/generator";
import { analyzeTop10, DEFAULT_TOP10_RECENCY, generateTop10Safe, top10Level, TOP10_VERSION } from "./generator";
import { openTop10, top10Seed } from "./secret";
import type { Top10Challenge } from "./types";

/** A frozen daily Top 10, as stored in data/daily-challenges.json (`top10` section). */
export interface FrozenTop10 {
  /** AES-256-GCM sealed Top10Challenge, bound to the challenge number. */
  challenge: SealedBox;
  generatorVersion: string;
  fallbackStep: number;
  dataset: { count: number; hash: string };
  /** Random, answer-independent progress key for the client. */
  salt: string;
  frozenAt: string;
}

export interface DailyTop10 {
  number: number;
  date: DateKey;
  /** null when the secret key is missing/invalid: the game is unavailable. */
  challenge: Top10Challenge | null;
  progressKey: string;
  source: "frozen" | "generated" | "unavailable";
}

/** Generates the challenge for a day (Top 10 weekly difficulty curve). Never throws. */
export function generateDailyTop10(
  number: number,
  deps: { data: QuartetsData; key: Buffer; lookup: (n: number) => Top10Challenge | null },
) {
  const recent: Array<Top10Challenge | null> = [];
  const days = Math.max(DEFAULT_TOP10_RECENCY.comboDays, DEFAULT_TOP10_RECENCY.overlapDays);
  for (let n = number - 1, i = 0; n >= 1 && i < days; n--, i++) recent.push(deps.lookup(n));
  return generateTop10Safe({
    seed: top10Seed(deps.key, number, TOP10_VERSION),
    data: deps.data,
    level: top10Level(dateForChallengeNumber(number)),
    recent,
  });
}

/** Resolves the Top 10 for a challenge number. Frozen challenges win; never throws. */
export function resolveDailyTop10(
  number: number,
  deps: { data: QuartetsData; store: ChallengeStore; key: Buffer | null; onWarning?: (message: string) => void },
): DailyTop10 {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const stored = deps.store.get<FrozenTop10>("top10", number);

  if (!deps.key) {
    warn("GUESS_SECRET_KEY is missing or invalid; Top 10 is unavailable.");
    return { number, date, challenge: null, progressKey: stored?.payload.salt ?? "unavailable", source: "unavailable" };
  }
  const open = (n: number) => {
    const entry = deps.store.get<FrozenTop10>("top10", n);
    return entry ? openTop10(entry.payload.challenge, n, deps.key!) : null;
  };

  if (stored) {
    const challenge = open(number);
    if (challenge && analyzeTop10(challenge, deps.data).problems.length === 0) {
      return { number, date: stored.date, challenge, progressKey: stored.payload.salt, source: "frozen" };
    }
    warn(`Frozen Top 10 #${number} could not be decrypted or is invalid; game unavailable.`);
    return { number, date, challenge: null, progressKey: stored.payload.salt, source: "unavailable" };
  }

  warn(`Top 10 #${number} is not frozen; generating on the fly. Run \`npm run top10:freeze\`.`);
  const generated = generateDailyTop10(number, { data: deps.data, key: deps.key, lookup: open });
  return { number, date, challenge: generated.challenge, progressKey: `generated:v${TOP10_VERSION}`, source: "generated" };
}
