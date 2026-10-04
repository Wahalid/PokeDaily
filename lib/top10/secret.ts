import { deriveSubkey, openJson, sealJson, secretSeed, type SealedBox } from "@/lib/crypto/sealed";
import type { Top10Challenge } from "./types";

/** Secrets for Top 10 (server / scripts only): a "top10" sub-key derived from GUESS_SECRET_KEY. */

export const deriveTop10Key = (platformKey: Buffer) => deriveSubkey(platformKey, "top10");

const context = (challengeNumber: number) => `pokedaily:top10:${challengeNumber}`;

export const sealTop10 = (challenge: Top10Challenge, challengeNumber: number, key: Buffer) =>
  sealJson(challenge, context(challengeNumber), key);

export const openTop10 = (box: SealedBox, challengeNumber: number, key: Buffer) =>
  openJson<Top10Challenge>(box, context(challengeNumber), key);

export const top10Seed = (key: Buffer, challengeNumber: number, version: string) =>
  secretSeed(key, `pokedaily:top10:seed:v${version}:${challengeNumber}`);
