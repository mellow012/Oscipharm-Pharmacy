import { pluralizeLabel } from "@/lib/plural";
import { StatusBadge } from "@/features/shared/components/StatusBadge";

export type StaffCatalogVariantRow = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  ingredientId: string | null;
  ingredientName: string | null;
  brandName: string;
  strength: string | null;
  packSize: number;
  unitLabel: string;
  allowsLooseSale: boolean;
  isActive: boolean;
  pricePerPack: string | null;
  pricePerUnit: string | null;
  stock: number;
  aroniumProductLinks: Array<{ id: string; aroniumCode: string; mode: "PACK" | "UNIT" }>;
};

export type StaffCatalogIngredientGroup = {
  ingredientName: string;
  categoryName: string;
  rows: StaffCatalogVariantRow[];
};

function formatCurrency(value: string | null) {
  if (!value) return "—";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `MK ${numeric.toLocaleString("en-MW")}` : value;
}

export function StaffCatalogVariantList({
  groups,
  searchText,
  onSelect,
}: {
  groups: StaffCatalogIngredientGroup[];
  searchText: string;
  onSelect: (variantId: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-space-lg">
      {groups.map((group) => (
        <section
          key={`${group.categoryName}:${group.ingredientName}`}
          className="min-w-0 border border-outline-variant bg-surface-container-lowest p-space-md"
        >
          <div className="mb-space-sm flex min-w-0 items-center justify-between gap-space-sm border-b border-outline-variant pb-space-sm">
            <h2 className="min-w-0 break-words font-headline-sm text-headline-sm text-primary">
              {group.ingredientName}
            </h2>
            {searchText ? (
              <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">
                {group.categoryName}
              </span>
            ) : null}
          </div>
          <div className="mb-space-xs hidden grid-cols-[minmax(0,2.3fr)_repeat(4,minmax(70px,1fr))_minmax(70px,1fr)_minmax(90px,1fr)] gap-space-sm px-space-sm font-table-header text-table-header uppercase text-on-surface-variant sm:grid">
            <span>Brand</span>
            <span>Pack size</span>
            <span>Pack price</span>
            <span>Unit price</span>
            <span>Stock</span>
            <span>Status</span>
            <span>Aronium</span>
          </div>
          <div className="min-w-0 space-y-space-xs">
            {group.rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onSelect(row.id)}
                className={`grid min-h-11 w-full min-w-0 grid-cols-1 gap-space-sm border px-space-sm py-space-sm text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:grid-cols-[minmax(0,2.3fr)_repeat(4,minmax(70px,1fr))_minmax(70px,1fr)_minmax(90px,1fr)] sm:items-center ${row.isActive ? "border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low" : "border-status-danger/25 bg-status-danger-bg hover:bg-status-danger-bg/70"}`}
              >
                <div>
                  <div className="break-words font-label-md text-label-md text-on-surface">
                    {row.brandName}
                  </div>
                  {row.strength ? (
                    <div className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
                      {row.strength}
                    </div>
                  ) : null}
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  <span className="font-semibold tabular-nums text-on-surface">{row.packSize}</span>{" "}
                  {pluralizeLabel(row.packSize, row.unitLabel)}
                </div>
                <div className="font-body-sm text-body-sm tabular-nums text-on-surface">
                  {formatCurrency(row.pricePerPack)}
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {row.allowsLooseSale ? (
                    <span className="tabular-nums text-on-surface">
                      {formatCurrency(row.pricePerUnit)}
                    </span>
                  ) : (
                    <span>Pack only</span>
                  )}
                </div>
                <div className="font-body-sm text-body-sm tabular-nums text-on-surface">
                  {row.stock}
                </div>
                <div>
                  <StatusBadge tone={row.isActive ? "success" : "danger"}>
                    {row.isActive ? "Active" : "Inactive"}
                  </StatusBadge>
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">
                  {row.aroniumProductLinks.length > 0 ? (
                    <span className="tabular-nums text-on-surface">
                      {row.aroniumProductLinks.length}{" "}
                      {pluralizeLabel(row.aroniumProductLinks.length, "code")}
                    </span>
                  ) : (
                    <span>Not linked</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
