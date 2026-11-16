import { Package, Pill } from "lucide-react";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { formatMwk } from "@/features/catalog/utils/formatPrice";
import type { PublicCatalogVariant } from "@/features/catalog/lib/queries";
import type { PublicAvailabilityStatus } from "@/features/catalog/lib/public-availability";

const statusDetails: Record<PublicAvailabilityStatus, { label: string; tone: "success" | "warning" | "danger" }> = {
    "out-of-stock": { label: "Out of stock", tone: "danger" },
    "low-stock": { label: "Low stock", tone: "warning" },
    "in-stock": { label: "In stock", tone: "success" },
};

function formIcon(unitLabel: string) {
    if (/tablet|capsule|caplet|pill/i.test(unitLabel)) return Pill;
    if (/strip|sachet|bottle|pack|blister|box/i.test(unitLabel)) return Package;
    return Pill;
}

export function VariantList({ variants }: { variants: PublicCatalogVariant[] }) {
    if (!variants.length) return <p className="border border-dashed border-outline-variant px-5 py-6 text-body-md text-on-surface-variant">No products listed for this ingredient.</p>;

    return (
        <ul className="grid gap-4">
            {variants.map((variant) => {
                const Icon = formIcon(variant.unitLabel);
                return (
                    <li key={`${variant.brandName}-${variant.strength ?? ""}-${variant.unitLabel}`} className="border border-outline-variant bg-surface-container-lowest p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                            <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center bg-primary-fixed/45 text-primary">
                                <Icon size={22} strokeWidth={1.7} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="font-display text-headline-sm text-ink">{variant.brandName}</h2>
                                <p className="mt-1 text-body-sm text-on-surface-variant">
                                    {variant.strength ? `${variant.strength} · ` : ""}Pack of {variant.packSize} {variant.unitLabel}
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 border-t border-outline-variant pt-3">
                            <h3 className="mb-2 font-label-md text-label-md text-on-surface">Branch availability</h3>
                            {variant.branches.length ? (
                                <ul className="divide-y divide-outline-variant/70">
                                    {variant.branches.map((branch) => {
                                        const status = statusDetails[branch.status];
                                        return (
                                            <li key={`${branch.name}-${branch.location}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                                <div>
                                                    <p className="font-label-md text-label-md text-on-surface">{branch.name}</p>
                                                    <p className="mt-1 text-body-sm text-on-surface-variant">{branch.location}</p>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                                                    <span className="min-w-24 text-right font-label-md text-label-md text-primary">
                                                        {branch.pricePerPack === null ? "Price not listed" : formatMwk(branch.pricePerPack)}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : <p className="text-body-sm text-on-surface-variant">No active branches are listed.</p>}
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}