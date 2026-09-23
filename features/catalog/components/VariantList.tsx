import { Variant } from "@prisma/client";

export function VariantList({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) {
    return <p className="text-muted">No variants found.</p>;
  }

  return (
    <div className="border-y border-border">
      {variants.map((v, index) => (
        <div
          key={v.id}
          className="grid gap-4 border-b border-border py-5 last:border-b-0 sm:grid-cols-[3rem_1fr_auto] sm:items-center"
        >
          <span className="font-mono text-xs text-warn">0{index + 1}</span>
          <div>
            <p className="font-display text-2xl text-ink">{v.brandName}</p>
            <p className="mt-1 text-sm text-muted">{v.strength ?? "Standard strength"} · {v.packSize} per pack</p>
          </div>
          <div className="text-left sm:text-right">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-warn">Available in branches</span>
          </div>
        </div>
      ))}
    </div>
  );
}
