import { deriveSubkey, openBytes, openJson, sealBytes, sealJson, secretSeed, type SealedBox } from "@/lib/crypto/sealed";
import type { CryChallenge } from "./types";

/** Secrets for PokéCry (server / scripts only): a "cry" sub-key derived from GUESS_SECRET_KEY. */

export const deriveCryKey = (platformKey: Buffer) => deriveSubkey(platformKey, "cry");

const context = (challengeNumber: number) => `pokedaily:cry:${challengeNumber}`;

export const sealCry = (challenge: CryChallenge, challengeNumber: number, key: Buffer) => sealJson(challenge, context(challengeNumber), key);

export const openCry = (box: SealedBox, challengeNumber: number, key: Buffer) => openJson<CryChallenge>(box, context(challengeNumber), key);

export const crySeed = (key: Buffer, challengeNumber: number, version: string) =>
  secretSeed(key, `pokedaily:cry:seed:v${version}:${challengeNumber}`);

// ---- Audio (cries are stored encrypted, under names that don't reveal the Pokémon) ----

/** Public source of every cry (PokéAPI cries repository, Ogg). Used to prepare assets and as a runtime fallback. */
export const crySourceUrl = (pokemonId: number) => `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemonId}.ogg`;

/** Opaque file name of a prepared cry: without the key, files can't be mapped to Pokémon. */
export const cryAudioName = (key: Buffer, pokemonId: number) => `${secretSeed(key, `pokedaily:cry:audio-name:${pokemonId}`).slice(0, 24)}.bin`;

const audioContext = (pokemonId: number) => `pokedaily:cry:audio:${pokemonId}`;

export const sealCryAudio = (mp3: Buffer, pokemonId: number, key: Buffer) => sealBytes(mp3, audioContext(pokemonId), key);

export const openCryAudio = (box: Buffer, pokemonId: number, key: Buffer) => openBytes(box, audioContext(pokemonId), key);
