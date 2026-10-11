import type { ReactNode } from "react";

type Tone = "error" | "info" | "success";

const tones: Record<Tone, string> = {
  error: "border-ember-500/40 bg-ember-500/10 text-ember-300",
  info: "border-brand-500/30 bg-brand-500/10 text-brand-200",
  success: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
};

/** Inline status message (unavailable game, errors, confirmations). */
export function Notice({ tone = "info", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`mx-auto max-w-md rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}
