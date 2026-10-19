import { pluralizeLabel } from "@/lib/plural";

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
        <div className="space-y-6">
            {groups.map((group) => (
                <section key={`${group.categoryName}:${group.ingredientName}`} className="rounded border border-border bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3 border-b border-border pb-3">
                        <h2 className="text-lg text-ink">{group.ingredientName}</h2>
                        {searchText ? <span className="text-xs uppercase tracking-[0.08em] text-muted">{group.categoryName}</span> : null}
                    </div>
                    <div className="mb-1 hidden grid-cols-[minmax(0,2.3fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(80px,1fr)_minmax(120px,1fr)] gap-2 px-3 text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted sm:grid">
                        <span>Brand</span>
                        <span>Pack size</span>
                        <span>Pack price</span>
                        <span>Unit price</span>
                        <span>Stock</span>
                        <span>Status</span>
                        <span>Aronium</span>
                    </div>
                    <div className="space-y-2">
                        {group.rows.map((row) => (
                            <button
                                key={row.id}
                                type="button"
                                onClick={() => onSelect(row.id)}
                                className={`grid w-full grid-cols-1 gap-2 rounded border px-3 py-3 text-left transition sm:grid-cols-[minmax(0,2.3fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(90px,1fr)_minmax(80px,1fr)_minmax(120px,1fr)] sm:items-center ${row.isActive ? "border-border bg-surface hover:border-primary/40 hover:bg-white" : "border-danger/25 bg-danger/5 hover:border-danger/50"}`}
                            >
                                <div>
                                    <div className="font-medium text-ink">{row.brandName}</div>
                                    {row.strength ? <div className="text-sm text-muted">{row.strength}</div> : null}
                                </div>
                                <div className="text-sm text-muted"><span className="font-medium text-ink">{row.packSize}</span> {pluralizeLabel(row.packSize, row.unitLabel)}</div>
                                <div className="text-sm text-muted"><span className="font-medium text-ink">{formatCurrency(row.pricePerPack)}</span></div>
                                <div className="text-sm text-muted">
                                    {row.allowsLooseSale ? <span className="font-medium text-ink">{formatCurrency(row.pricePerUnit)}</span> : <span>Pack only</span>}
                                </div>
                                <div className="text-sm text-muted"><span className="font-medium text-ink">{row.stock}</span></div>
                                <div>
                                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[0.62rem] font-medium uppercase tracking-[0.1em] ${row.isActive ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/10 text-danger"}`}>
                                        {row.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <div className="text-sm text-muted">
                                    {row.aroniumProductLinks.length > 0 ? <span className="font-medium text-ink">{row.aroniumProductLinks.length} {pluralizeLabel(row.aroniumProductLinks.length, "code")}</span> : <span className="text-muted/80">Not linked</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}