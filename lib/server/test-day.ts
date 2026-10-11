import "server-only";

import { cookies } from "next/headers";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { MAX_TEST_DAY_OFFSET, TEST_DAY_COOKIE } from "@/lib/daily/test-day";

/**
 * TEMPORARY development tool: play future daily challenges ("TEST: SIGUIENTE DÍA").
 *
 * Only active under `next dev` (NODE_ENV === "development"). In production the
 * cookie is ignored, the controls are not rendered and the actions refuse, so
 * the date can't be moved by public parameters or crafted requests there.
 */
export const testDayEnabled = () => process.env.NODE_ENV === "development";

/** Days added to the real date (0 = real day). */
export async function testDayOffset(): Promise<number> {
  if (!testDayEnabled()) return 0;
  const value = Number((await cookies()).get(TEST_DAY_COOKIE)?.value);
  return Number.isInteger(value) && value > 0 && value <= MAX_TEST_DAY_OFFSET ? value : 0;
}

/** The challenge number every game must use as "today" (real day + test offset in development). */
export async function todayNumber(): Promise<number> {
  return currentChallengeNumber() + (await testDayOffset());
}
