import Link from "next/link";
import { ChevronRight, Package, Pill } from "lucide-react";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { formatMwk } from "@/features/catalog/utils/formatPrice";
import type { PublicAvailabilityStatus } from "@/features/catalog/lib/public-availability";

export type CatalogProduct = {
    id: string;
    brandName: string;
    strength: string | null;
    packSize: number;
    unitLabel: string;
    form: string;
    packLabel: string;
    ingredientName: string | null;
    categoryName: string | null;
    availability: PublicAvailabilityStatus;
    pricePerPack: number | null;
    hasMultiplePrices: boolean;
    branches: Array<{
        id: string;
        status: PublicAvailabilityStatus;
        pricePerPack: number | null;
    }>;
};

function formIcon(unitLabel: string) {
    if (/tablet|capsule|caplet|pill/i.test(unitLabel)) return Pill;
    if (/strip|sachet|bottle|pack|blister|box/i.test(unitLabel)) return Package;
    return Pill;
}

export function CatalogProductCard({ product }: { product: CatalogProduct }) {
    const Icon = formIcon(product.unitLabel);

    return (
        <Link
            href={`/catalog/product/${product.id}`}
            prefetch={false}
            aria-label={`${product.brandName}${product.strength ? ` ${product.strength}` : ""}${product.availability === "low-stock" ? ". Limited stock." : ". Available."}`}
            className="group flex min-h-11 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
            <article className="flex min-h-[220px] w-full flex-col border border-outline-variant bg-surface-container-lowest p-5 transition-colors group-hover:border-primary sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center bg-primary-fixed/45 text-primary" aria-hidden="true">
                        <Icon size={22} strokeWidth={1.7} />
                    </span>
                    {product.availability === "low-stock" ? <StatusBadge tone="warning">Limited stock</StatusBadge> : null}
                </div>
                {product.ingredientName ? <p className="mt-4 font-label-sm text-label-sm text-on-surface-variant">{product.ingredientName}</p> : null}
                <h2 className="mt-2 break-words font-display text-headline-sm text-ink group-hover:text-primary">{product.brandName}</h2>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body-sm text-on-surface-variant">
                    {product.strength ? <span>{product.strength}</span> : <span aria-hidden="true">&nbsp;</span>}
                    <span>Pack of {product.packSize} {product.unitLabel}</span>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-4">
                    {product.pricePerPack !== null ? (
                        <p className="font-label-md text-label-md font-semibold text-primary">
                            {product.hasMultiplePrices ? "from " : ""}{formatMwk(product.pricePerPack)}
                        </p>
                    ) : <span className="font-body-sm text-body-sm text-on-surface-variant">Call branch for price</span>}
                    <span className="flex size-11 items-center justify-center text-primary" aria-hidden="true"><ChevronRight size={19} /></span>
                </div>
            </article>
        </Link>
    );
}