import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Secrets for "Adivina el Pokémon" (server / scripts only — uses node:crypto).
 *
 * The repository is public, so daily answers are never stored or derivable in
 * plain form:
 * - frozen answers are encrypted with AES-256-GCM (key in GUESS_SECRET_KEY);
 * - the selection order for non-frozen days is seeded from an HMAC of that key.
 * Without the key, neither the stored answers nor future ones can be recovered.
 */

export const GUESS_KEY_ENV = "GUESS_SECRET_KEY";

/** Encrypted Pokémon id (base64url fields). */
export interface EncryptedAnswer {
  iv: string;
  tag: string;
  data: string;
}

/** Parses a 32-byte key given as 64 hex characters. Returns null if missing/invalid. */
export function parseGuessKey(raw: string | undefined): Buffer | null {
  const value = raw?.trim();
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value)) return null;
  return Buffer.from(value, "hex");
}

export function generateGuessKey(): string {
  return randomBytes(32).toString("hex");
}

/** Associated data binds each ciphertext to its challenge number (entries can't be swapped). */
const aad = (challengeNumber: number) => Buffer.from(`pokedaily:guess:${challengeNumber}`);

export function encryptAnswer(pokemonId: number, challengeNumber: number, key: Buffer): EncryptedAnswer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad(challengeNumber));
  // Fixed width so the ciphertext length doesn't hint at the number of digits.
  const plain = Buffer.from(String(pokemonId).padStart(4, "0"));
  const data = Buffer.concat([cipher.update(plain), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: data.toString("base64url") };
}

/** Returns the Pokémon id, or null if the key is wrong or the data was tampered with. */
export function decryptAnswer(encrypted: EncryptedAnswer, challengeNumber: number, key: Buffer): number | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(encrypted.iv, "base64url"));
    decipher.setAAD(aad(challengeNumber));
    decipher.setAuthTag(Buffer.from(encrypted.tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted.data, "base64url")), decipher.final()]);
    const id = Number(plain.toString());
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Secret seed for the selection order of non-frozen days. */
export function secretOrderSeed(key: Buffer, version: string): string {
  return createHmac("sha256", key).update(`pokedaily:guess:order:v${version}`).digest("hex");
}
