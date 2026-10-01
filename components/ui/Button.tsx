import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun-400 disabled:opacity-50 " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]";

/** PokeDaily buttons (dark surfaces). Primary matches the hub's yellow call-to-action. */
const variants: Record<Variant, string> = {
  primary: "bg-sun-400 text-night-950 shadow-[0_6px_20px_-6px_rgb(255_201_40/0.6)] hover:bg-sun-300",
  secondary: "border border-white/15 bg-night-700 text-white hover:border-white/30 hover:bg-night-600",
  ghost: "text-mist hover:bg-white/5 hover:text-white",
};

export function buttonClass(variant: Variant = "primary", className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
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
