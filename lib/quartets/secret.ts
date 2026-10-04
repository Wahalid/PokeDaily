import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import type { QuartetBoard } from "./types";

/**
 * Secrets for Cuartetos (server / scripts only — uses node:crypto).
 *
 * Reuses the platform secret GUESS_SECRET_KEY (one env var on Netlify) but
 * never uses it directly: a separate sub-key is derived with HMAC, so Cuartetos
 * ciphertexts and seeds are cryptographically independent from Guess.
 */

export interface EncryptedBoard {
  iv: string;
  tag: string;
  data: string;
}

/** Derives the Cuartetos sub-key from the platform key. */
export function deriveQuartetsKey(platformKey: Buffer): Buffer {
  return createHmac("sha256", platformKey).update("pokedaily:quartets:encryption-key:v1").digest();
}

const aad = (challengeNumber: number) => Buffer.from(`pokedaily:quartets:${challengeNumber}`);

export function encryptBoard(board: QuartetBoard, challengeNumber: number, key: Buffer): EncryptedBoard {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(challengeNumber));
  const data = Buffer.concat([cipher.update(JSON.stringify(board), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: data.toString("base64url") };
}

/** Returns the board, or null if the key is wrong or the data was tampered with. */
export function decryptBoard(encrypted: EncryptedBoard, challengeNumber: number, key: Buffer): QuartetBoard | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64url"));
    decipher.setAAD(aad(challengeNumber));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted.data, "base64url")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as QuartetBoard;
  } catch {
    return null;
  }
}

/** Secret per-day seed: the public code cannot be used to predict boards. */
export function quartetsSeed(key: Buffer, challengeNumber: number, version: string): string {
  return createHmac("sha256", key).update(`pokedaily:quartets:seed:v${version}:${challengeNumber}`).digest("hex");
}
