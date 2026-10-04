import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * Generic helpers to keep daily-game solutions secret (server / scripts only).
 *
 * - deriveSubkey: per-game key derived from the platform key (GUESS_SECRET_KEY)
 *   with HMAC, so each game's ciphertexts and seeds are independent;
 * - sealJson / openJson: AES-256-GCM, bound to a context string (game + day)
 *   via associated data, so a ciphertext cannot be moved to another day/game.
 */

export interface SealedBox {
  iv: string;
  tag: string;
  data: string;
}

export function deriveSubkey(platformKey: Buffer, purpose: string): Buffer {
  return createHmac("sha256", platformKey).update(`pokedaily:${purpose}:encryption-key:v1`).digest();
}

export function sealJson(value: unknown, context: string, key: Buffer): SealedBox {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return { iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url"), data: data.toString("base64url") };
}

/** Returns the value, or null if the key/context is wrong or the data was tampered with. */
export function openJson<T>(box: SealedBox, context: string, key: Buffer): T | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64url"));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(box.tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(box.data, "base64url")), decipher.final()]);
    return JSON.parse(plain.toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Secret deterministic seed (hex) for a given purpose. */
export function secretSeed(key: Buffer, label: string): string {
  return createHmac("sha256", key).update(label).digest("hex");
}

/** Binary variant (e.g. audio files): iv (12) | tag (16) | ciphertext, bound to `context` like sealJson. */
export function sealBytes(value: Buffer, context: string, key: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const data = Buffer.concat([cipher.update(value), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]);
}

/** Returns the bytes, or null if the key/context is wrong or the data was tampered with. */
export function openBytes(box: Buffer, context: string, key: Buffer): Buffer | null {
  try {
    if (box.length < 28) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, box.subarray(0, 12));
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(box.subarray(12, 28));
    return Buffer.concat([decipher.update(box.subarray(28)), decipher.final()]);
  } catch {
    return null;
  }
}
