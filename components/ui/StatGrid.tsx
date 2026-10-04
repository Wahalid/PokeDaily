/** Compact row of stat tiles (PokeDaily style). */
export function StatGrid({ items }: { items: ReadonlyArray<{ label: string; value: number | string }> }) {
  return (
    <dl className="grid gap-2 text-center" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/10 bg-night-900/60 px-1 py-2">
          <dd className="text-xl font-black tabular-nums">{item.value}</dd>
          <dt className="text-[10px] leading-tight font-semibold text-mist uppercase">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
}
