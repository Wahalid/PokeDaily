import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-night-950/75 text-white backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sun-400"
        >
          <Logo />
          <span className="text-lg">
            Poke<span className="text-sun-400">Daily</span>
          </span>
        </Link>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="relative grid size-7 place-items-center overflow-hidden rounded-full border-2 border-white bg-white transition-transform group-hover:rotate-12"
    >
      <span className="absolute inset-x-0 top-0 h-1/2 bg-ember-500" />
      <span className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-ink" />
      <span className="relative size-2.5 rounded-full border-2 border-ink bg-white" />
    </span>
  );
}
