import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Shared PokeDaily shell (deep navy + pinstripe backdrop) used by the hub
 * and every game page, so the whole platform feels like one product.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-backdrop relative isolate flex min-h-dvh flex-col bg-night-900 text-white">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
