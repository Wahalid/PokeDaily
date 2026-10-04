import type { SealedBox } from "@/lib/crypto/sealed";
import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import { analyzeImpostor, generateImpostor, impostorLevel, IMPOSTOR_VERSION, RECENCY_WINDOW, type ImpostorData } from "./generator";
import { impostorSeed, openImpostor } from "./secret";
import type { ImpostorChallenge } from "./types";

/** A frozen daily PokéImpostor, as stored in data/daily-challenges.json (`impostor` section). */
export interface FrozenImpostor {
  /** AES-256-GCM sealed ImpostorChallenge, bound to the challenge number. */
  challenge: SealedBox;
  generatorVersion: string;
  fallbackStep: number;
  dataset: { count: number; hash: string };
  /** Random, answer-independent progress key for the client. */
  salt: string;
  frozenAt: string;
}

export interface DailyImpostor {
  number: number;
  date: DateKey;
  /** null when the secret key is missing/invalid: the game is unavailable. */
  challenge: ImpostorChallenge | null;
  progressKey: string;
  source: "frozen" | "generated" | "unavailable";
}

/** Generates the board for a day (weekly difficulty curve, recency against previous days). Never throws. */
export function generateDailyImpostor(
  number: number,
  deps: { data: ImpostorData; key: Buffer; lookup: (n: number) => ImpostorChallenge | null },
) {
  const recent: Array<ImpostorChallenge | null> = [];
  for (let n = number - 1, i = 0; n >= 1 && i < RECENCY_WINDOW; n--, i++) recent.push(deps.lookup(n));
  return generateImpostor({
    seed: impostorSeed(deps.key, number, IMPOSTOR_VERSION),
    data: deps.data,
    level: impostorLevel(dateForChallengeNumber(number)),
    recent,
  });
}

/** Resolves the board for a challenge number. Frozen boards win; never throws. */
export function resolveDailyImpostor(
  number: number,
  deps: { data: ImpostorData; store: ChallengeStore; key: Buffer | null; onWarning?: (message: string) => void },
): DailyImpostor {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const stored = deps.store.get<FrozenImpostor>("impostor", number);

  if (!deps.key) {
    warn("GUESS_SECRET_KEY is missing or invalid; PokéImpostor is unavailable.");
    return { number, date, challenge: null, progressKey: stored?.payload.salt ?? "unavailable", source: "unavailable" };
  }
  const open = (n: number) => {
    const entry = deps.store.get<FrozenImpostor>("impostor", n);
    return entry ? openImpostor(entry.payload.challenge, n, deps.key!) : null;
  };

  if (stored) {
    const challenge = open(number);
    if (challenge && analyzeImpostor(challenge, deps.data).problems.length === 0) {
      return { number, date: stored.date, challenge, progressKey: stored.payload.salt, source: "frozen" };
    }
    warn(`Frozen PokéImpostor #${number} could not be decrypted or is invalid; game unavailable.`);
    return { number, date, challenge: null, progressKey: stored.payload.salt, source: "unavailable" };
  }

  warn(`PokéImpostor #${number} is not frozen; generating on the fly. Run \`npm run impostor:freeze\`.`);
  const generated = generateDailyImpostor(number, { data: deps.data, key: deps.key, lookup: open });
  return { number, date, challenge: generated.challenge, progressKey: `generated:v${IMPOSTOR_VERSION}`, source: "generated" };
}
