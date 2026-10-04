import type { SealedBox } from "@/lib/crypto/sealed";
import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import { analyzeCry, ANSWER_REPEAT_DAYS, CRY_VERSION, generateCry, type CryData } from "./generator";
import { crySeed, openCry } from "./secret";
import type { CryChallenge } from "./types";

/** A frozen daily PokéCry, as stored in data/daily-challenges.json (`cry` section). */
export interface FrozenCry {
  /** AES-256-GCM sealed CryChallenge, bound to the challenge number. */
  challenge: SealedBox;
  generatorVersion: string;
  fallbackStep: number;
  dataset: { count: number; hash: string };
  /** Random, answer-independent progress key for the client. */
  salt: string;
  frozenAt: string;
}

export interface DailyCry {
  number: number;
  date: DateKey;
  /** null when the secret key is missing/invalid: the game is unavailable. */
  challenge: CryChallenge | null;
  progressKey: string;
  source: "frozen" | "generated" | "unavailable";
}

/** Generates the day (recency against previous days). `hasCry` lets the freeze exclude broken audio. */
export function generateDailyCry(
  number: number,
  deps: { data: CryData; key: Buffer; lookup: (n: number) => CryChallenge | null; hasCry?: (id: number) => boolean },
) {
  const recent: Array<CryChallenge | null> = [];
  for (let n = number - 1, i = 0; n >= 1 && i < ANSWER_REPEAT_DAYS; n--, i++) recent.push(deps.lookup(n));
  return generateCry({ seed: crySeed(deps.key, number, CRY_VERSION), data: deps.data, recent, hasCry: deps.hasCry });
}

/** Resolves the day. Frozen days win; never throws. */
export function resolveDailyCry(
  number: number,
  deps: { data: CryData; store: ChallengeStore; key: Buffer | null; onWarning?: (message: string) => void },
): DailyCry {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const stored = deps.store.get<FrozenCry>("cry", number);

  if (!deps.key) {
    warn("GUESS_SECRET_KEY is missing or invalid; PokéCry is unavailable.");
    return { number, date, challenge: null, progressKey: stored?.payload.salt ?? "unavailable", source: "unavailable" };
  }
  const open = (n: number) => {
    const entry = deps.store.get<FrozenCry>("cry", n);
    return entry ? openCry(entry.payload.challenge, n, deps.key!) : null;
  };

  if (stored) {
    const challenge = open(number);
    if (challenge && analyzeCry(challenge, deps.data).problems.length === 0) {
      return { number, date: stored.date, challenge, progressKey: stored.payload.salt, source: "frozen" };
    }
    warn(`Frozen PokéCry #${number} could not be decrypted or is invalid; game unavailable.`);
    return { number, date, challenge: null, progressKey: stored.payload.salt, source: "unavailable" };
  }

  warn(`PokéCry #${number} is not frozen; generating on the fly. Run \`npm run cry:freeze\`.`);
  const generated = generateDailyCry(number, { data: deps.data, key: deps.key, lookup: open });
  return { number, date, challenge: generated.challenge, progressKey: `generated:v${CRY_VERSION}`, source: "generated" };
}
