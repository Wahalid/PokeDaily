/** PokeDaily signature: blue · yellow · red. */
export function AccentBar({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`mx-auto flex w-24 gap-1.5 ${className}`}>
      <span className="h-1.5 flex-1 rounded-full bg-brand-500" />
      <span className="h-1.5 flex-1 rounded-full bg-sun-400" />
      <span className="h-1.5 flex-1 rounded-full bg-ember-500" />
    </div>
  );
}
