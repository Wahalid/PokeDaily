"use server";

import { cookies } from "next/headers";
import { MAX_TEST_DAY_OFFSET, TEST_DAY_COOKIE } from "@/lib/daily/test-day";
import { testDayEnabled, testDayOffset } from "@/lib/server/test-day";

/**
 * TEMPORARY development tool. Both actions refuse outside `next dev`, so the
 * test date can never be moved in production (where the cookie is ignored anyway).
 */
export async function advanceTestDay(): Promise<{ ok: boolean; offset: number }> {
  if (!testDayEnabled()) return { ok: false, offset: 0 };
  const offset = Math.min((await testDayOffset()) + 1, MAX_TEST_DAY_OFFSET);
  // Not httpOnly: the browser reads it to keep test progress in its own localStorage namespace.
  (await cookies()).set(TEST_DAY_COOKIE, String(offset), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  return { ok: true, offset };
}

export async function resetTestDay(): Promise<{ ok: boolean }> {
  if (!testDayEnabled()) return { ok: false };
  (await cookies()).delete(TEST_DAY_COOKIE);
  return { ok: true };
}
