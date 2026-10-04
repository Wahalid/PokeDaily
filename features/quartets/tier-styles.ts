import type { Tier } from "@/lib/quartets/types";

/** Visual style per difficulty tier (always paired with an icon + text label, never colour alone). */
export const TIER_STYLES: Record<Tier, { bar: string; chip: string }> = {
  0: { bar: "border-sun-400/60 bg-sun-400/15", chip: "bg-sun-400 text-night-950" },
  1: { bar: "border-emerald-400/60 bg-emerald-500/15", chip: "bg-emerald-400 text-night-950" },
  2: { bar: "border-brand-300/60 bg-brand-500/20", chip: "bg-brand-500 text-white" },
  3: { bar: "border-violet-400/60 bg-violet-500/20", chip: "bg-violet-500 text-white" },
};
