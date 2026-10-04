import type { SealedBox } from "@/lib/crypto/sealed";
import type { ChallengeStore } from "@/lib/daily/challenge-store";
import { dateForChallengeNumber, type DateKey } from "@/lib/daily/calendar";
import { generateWordle, REPEAT_DAYS, WORDLE_VERSION } from "./generator";
import { openWordle, wordleSeed } from "./secret";
import type { WordleChallenge } from "./types";
import type { WordleDictionary } from "./words";

/** A frozen daily PokéWordle, as stored in data/daily-challenges.json (`wordle` section). */
export interface FrozenWordle {
  /** AES-256-GCM sealed WordleChallenge (fixed width), bound to the challenge number. */
  challenge: SealedBox;
  generatorVersion: string;
  fallbackStep: number;
  dataset: { count: number; hash: string };
  /** Random, answer-independent progress key for the client. */
  salt: string;
  frozenAt: string;
}

export interface DailyWordle {
  number: number;
  date: DateKey;
  /** null when the secret key is missing/invalid: the game is unavailable. */
  challenge: WordleChallenge | null;
  progressKey: string;
  source: "frozen" | "generated" | "unavailable";
}

/** Generates the secret for a day, avoiding recent ones. Never throws. */
export function generateDailyWordle(
  number: number,
  deps: { dict: WordleDictionary; key: Buffer; lookup: (n: number) => WordleChallenge | null },
) {
  const recent: Array<WordleChallenge | null> = [];
  for (let n = number - 1, i = 0; n >= 1 && i < REPEAT_DAYS; n--, i++) recent.push(deps.lookup(n));
  return generateWordle({ seed: wordleSeed(deps.key, number, WORDLE_VERSION), dict: deps.dict, recent });
}

/** Resolves the secret for a challenge number. Frozen days win; never throws. */
export function resolveDailyWordle(
  number: number,
  deps: { dict: WordleDictionary; store: ChallengeStore; key: Buffer | null; onWarning?: (message: string) => void },
): DailyWordle {
  const date = dateForChallengeNumber(number);
  const warn = deps.onWarning ?? (() => {});
  const stored = deps.store.get<FrozenWordle>("wordle", number);

  if (!deps.key) {
    warn("GUESS_SECRET_KEY is missing or invalid; PokéWordle is unavailable.");
    return { number, date, challenge: null, progressKey: stored?.payload.salt ?? "unavailable", source: "unavailable" };
  }
  const open = (n: number) => {
    const entry = deps.store.get<FrozenWordle>("wordle", n);
    return entry ? openWordle(entry.payload.challenge, n, deps.key!) : null;
  };

  if (stored) {
    const challenge = open(number);
    if (challenge && deps.dict.byWord.has(challenge.word)) {
      return { number, date: stored.date, challenge, progressKey: stored.payload.salt, source: "frozen" };
    }
    // Never fall back to another Pokémon for a frozen day: a wrong key must not change answers silently.
    warn(`Frozen PokéWordle #${number} could not be decrypted or is invalid; game unavailable.`);
    return { number, date, challenge: null, progressKey: stored.payload.salt, source: "unavailable" };
  }

  warn(`PokéWordle #${number} is not frozen; generating on the fly. Run \`npm run wordle:freeze\`.`);
  const generated = generateDailyWordle(number, { dict: deps.dict, key: deps.key, lookup: open });
  return { number, date, challenge: generated.challenge, progressKey: `generated:v${WORDLE_VERSION}`, source: "generated" };
}
