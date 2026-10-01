import type { ReactNode } from "react";

type Tone = "brand" | "sun" | "ember" | "neutral" | "success";

const tones: Record<Tone, string> = {
  brand: "bg-brand-500/15 text-brand-300 ring-brand-500/30",
  sun: "bg-sun-400/15 text-sun-300 ring-sun-400/30",
  ember: "bg-ember-500/15 text-ember-300 ring-ember-500/30",
  neutral: "bg-white/5 text-mist ring-white/15",
  success: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
