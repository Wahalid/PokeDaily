import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[11px] text-sm font-bold transition duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 disabled:cursor-default disabled:opacity-50 " +
  "motion-safe:active:scale-[0.98]";

/** PokeDaily buttons (dark surfaces). Primary is the hub cards' yellow call-to-action. */
const variants: Record<Variant, string> = {
  primary: "bg-sun-400 text-night-950 hover:bg-sun-300 disabled:hover:bg-sun-400",
  secondary: "border border-brand-500/30 bg-night-700 text-white hover:border-brand-300/55 hover:bg-night-600",
  ghost: "text-mist hover:bg-white/5 hover:text-white",
};

export function buttonClass(variant: Variant = "primary", className = ""): string {
  // Default padding unless the caller sets its own (two px-* classes would fight over utility order).
  const padding = `${/(^|\s)px-/.test(className) ? "" : "px-5"} ${/(^|\s)py-/.test(className) ? "" : "py-2"}`;
  return `${base} ${padding} ${variants[variant]} ${className}`;
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button type="button" className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
