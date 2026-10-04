import { deriveSubkey, openJson, sealJson, secretSeed, type SealedBox } from "@/lib/crypto/sealed";
import type { ImpostorChallenge } from "./types";

/** Secrets for PokéImpostor (server / scripts only): an "impostor" sub-key derived from GUESS_SECRET_KEY. */

export const deriveImpostorKey = (platformKey: Buffer) => deriveSubkey(platformKey, "impostor");

const context = (challengeNumber: number) => `pokedaily:impostor:${challengeNumber}`;

export const sealImpostor = (challenge: ImpostorChallenge, challengeNumber: number, key: Buffer) =>
  sealJson(challenge, context(challengeNumber), key);

export const openImpostor = (box: SealedBox, challengeNumber: number, key: Buffer) =>
  openJson<ImpostorChallenge>(box, context(challengeNumber), key);

export const impostorSeed = (key: Buffer, challengeNumber: number, version: string) =>
  secretSeed(key, `pokedaily:impostor:seed:v${version}:${challengeNumber}`);
