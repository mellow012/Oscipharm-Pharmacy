import { Variant } from "@prisma/client";

export function VariantList({ variants }: { variants: Variant[] }) {
  if (variants.length === 0) {
    return <p className="text-muted">No variants found.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {variants.map((v) => (
        <div
          key={v.id}
          className="p-4 rounded-xl border border-border bg-surface flex justify-between items-center"
        >
          <div>
            <p className="font-medium text-fg">{v.brandName}</p>
            <p className="text-sm text-muted">{v.strength}</p>
          </div>
          {/* Branch pricing would go here */}
          <div className="text-right">
            <span className="text-sm text-muted">View pricing</span>
          </div>
        </div>
      ))}
    </div>
  );
}
