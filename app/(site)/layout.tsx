import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { currentChallengeNumber } from "@/lib/daily/calendar";
import { testDayEnabled, testDayOffset } from "@/lib/server/test-day";
import { TestDayControls } from "@/features/dev/TestDayControls";

/**
 * Shared PokeDaily shell (deep navy + pinstripe backdrop) used by the hub
 * and every game page, so the whole platform feels like one product.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-backdrop relative isolate flex min-h-dvh flex-col bg-night-900 text-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      {/* TEMPORARY development tool: never rendered in production builds. */}
      {testDayEnabled() && <TestDayControls realNumber={currentChallengeNumber()} offset={await testDayOffset()} />}
    </div>
  );
}
