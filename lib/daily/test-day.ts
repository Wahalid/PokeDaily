/**
 * TEMPORARY development tool — shared constants (server + client) for the
 * "TEST: SIGUIENTE DÍA" button. See lib/server/test-day.ts.
 */
export const TEST_DAY_COOKIE = "pokedaily-test-day-offset";
export const MAX_TEST_DAY_OFFSET = 365;

/** localStorage namespace while testing, so test progress never mixes with the real one. */
export const TEST_STORAGE_PREFIX = "pokedaily-test:";

/** Client: true when the browser is in test-day mode (development builds only). */
export function isTestDayClient(): boolean {
  if (process.env.NODE_ENV !== "development" || typeof document === "undefined") return false;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TEST_DAY_COOKIE}=(\\d+)`));
  return !!match && Number(match[1]) > 0;
}
