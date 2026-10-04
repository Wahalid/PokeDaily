import { deriveSubkey, openJson, sealJson, secretSeed, type SealedBox } from "@/lib/crypto/sealed";
import type { WordleChallenge } from "./types";

/** Secrets for PokéWordle (server / scripts only): a "wordle" sub-key derived from GUESS_SECRET_KEY. */

export const deriveWordleKey = (platformKey: Buffer) => deriveSubkey(platformKey, "wordle");

const context = (challengeNumber: number) => `pokedaily:wordle:${challengeNumber}`;

/** Fixed-width plaintext, so the ciphertext size doesn't reveal the word length. */
const WIDTH = 16;

export const sealWordle = (challenge: WordleChallenge, challengeNumber: number, key: Buffer) =>
  sealJson({ word: challenge.word.padEnd(WIDTH, " ") }, context(challengeNumber), key);

export function openWordle(box: SealedBox, challengeNumber: number, key: Buffer): WordleChallenge | null {
  const value = openJson<WordleChallenge>(box, context(challengeNumber), key);
  return typeof value?.word === "string" ? { word: value.word.trim() } : null;
}

export const wordleSeed = (key: Buffer, challengeNumber: number, version: string) =>
  secretSeed(key, `pokedaily:wordle:seed:v${version}:${challengeNumber}`);
