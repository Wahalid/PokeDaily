/**
 * Daily calendar shared by every PokeDaily game.
 *
 * Days roll over at 00:00 UTC so every player worldwide sees the same
 * challenge number at the same moment. Challenge #1 is LAUNCH_DATE.
 */

export const LAUNCH_DATE = "2026-10-01";

const DAY_MS = 24 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in UTC. */
export type DateKey = string;

export function toDateKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now);
}

function parseDateKey(key: DateKey): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`Invalid date key "${key}"`);
  return Date.parse(`${key}T00:00:00Z`);
}

export function challengeNumberForDate(key: DateKey): number {
  return Math.floor((parseDateKey(key) - parseDateKey(LAUNCH_DATE)) / DAY_MS) + 1;
}

export function dateForChallengeNumber(number: number): DateKey {
  return toDateKey(new Date(parseDateKey(LAUNCH_DATE) + (number - 1) * DAY_MS));
}

export function currentChallengeNumber(now: Date = new Date()): number {
  return Math.max(1, challengeNumberForDate(todayKey(now)));
}

export function formatChallengeNumber(number: number): string {
  return `#${String(number).padStart(3, "0")}`;
}

export function formatDisplayDate(key: DateKey): string {
  return new Date(parseDateKey(key)).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}
