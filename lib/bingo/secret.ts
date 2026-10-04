import { deriveSubkey, openJson, sealJson, secretSeed, type SealedBox } from "@/lib/crypto/sealed";
import type { BingoChallenge } from "./types";

/**
 * Secrets for PokéBingo (server / scripts only). The platform key
 * (GUESS_SECRET_KEY) is never used directly: a "bingo" sub-key is derived.
 */

export const deriveBingoKey = (platformKey: Buffer) => deriveSubkey(platformKey, "bingo");

const context = (challengeNumber: number) => `pokedaily:bingo:${challengeNumber}`;

export const sealBingo = (challenge: BingoChallenge, challengeNumber: number, key: Buffer) =>
  sealJson(challenge, context(challengeNumber), key);

export const openBingo = (box: SealedBox, challengeNumber: number, key: Buffer) =>
  openJson<BingoChallenge>(box, context(challengeNumber), key);

export const bingoSeed = (key: Buffer, challengeNumber: number, version: string) =>
  secretSeed(key, `pokedaily:bingo:seed:v${version}:${challengeNumber}`);
