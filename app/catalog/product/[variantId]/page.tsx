import Link from "next/link";
import { ArrowLeft, MapPin, Package, Pill, Phone } from "lucide-react";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import { getPublicBranches, getPublicProduct } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { formatMwk } from "@/features/catalog/utils/formatPrice";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const dynamic = "force-dynamic";

const branchStatus = {
    "in-stock": { label: "Available", tone: "success" as const },
    "low-stock": { label: "Limited stock", tone: "warning" as const },
    "out-of-stock": { label: "Not available", tone: "neutral" as const },
};

function formIcon(unitLabel: string) {
    return /tablet|capsule|caplet|pill/i.test(unitLabel) ? Pill : Package;
}

export default async function CatalogProductPage({ params }: { params: Promise<{ variantId: string }> }) {
    const { variantId } = await params;
    const branches = await getPublicBranches();
    const product = await getPublicProduct(variantId, branches);
    if (!product) {
        return <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-6 sm:px-8 sm:py-8"><SiteHeader /><h1 className="mt-8 font-display text-headline-lg text-primary">Product not found</h1><PublicFooter branches={branches} /></main>;
    }

    const Icon = formIcon(product.unitLabel);
    const availableSomewhere = product.branches.some((branch) => branch.status !== "out-of-stock");

    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <nav aria-label="Breadcrumb" className="border-b border-outline-variant py-2">
                <Link href="/catalog" className="inline-flex min-h-11 items-center gap-2 font-label-md text-label-md text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <ArrowLeft aria-hidden="true" size={17} />Back to catalog
                </Link>
            </nav>
            <header className="border-b border-outline-variant py-7 sm:py-9">
                <div className="flex items-start gap-4">
                    <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center bg-primary-fixed/45 text-primary"><Icon size={23} strokeWidth={1.7} /></span>
                    <div className="min-w-0">
                        {product.ingredientName ? <p className="font-label-md text-label-md text-secondary">{product.ingredientName}</p> : null}
                        <h1 className="mt-1 break-words font-display text-headline-xl text-primary">{product.brandName}</h1>
                        {product.strength ? <p className="mt-2 text-body-lg text-on-surface-variant">{product.strength}</p> : null}
                    </div>
                </div>
                {!availableSomewhere ? <p className="mt-6 border-l-2 border-status-warning bg-status-warning-bg px-4 py-4 text-body-md text-status-warning-text">Currently unavailable. Call your branch.</p> : null}
            </header>

            <section aria-labelledby="pack-sizes-heading" className="border-b border-outline-variant py-7">
                <h2 id="pack-sizes-heading" className="font-display text-headline-md text-ink">Pack sizes and prices</h2>
                <ul className="mt-4 divide-y divide-outline-variant border-y border-outline-variant">
                    <li className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                        <span className="font-label-md text-label-md text-on-surface">Pack of {product.packSize} {product.unitLabel}</span>
                        <span className="font-label-md text-label-md font-semibold text-primary">
                            {product.branches.find((branch) => branch.pricePerPack !== null)?.pricePerPack !== undefined
                                ? formatMwk(product.branches.find((branch) => branch.pricePerPack !== null)!.pricePerPack!)
                                : "Call branch for price"}
                        </span>
                    </li>
                </ul>
            </section>

            <section aria-labelledby="availability-heading" className="py-7 sm:py-9">
                <h2 id="availability-heading" className="font-display text-headline-md text-ink">Branch availability</h2>
                <ul className="mt-4 divide-y divide-outline-variant border-y border-outline-variant">
                    {product.branches.map((branch) => {
                        const status = branchStatus[branch.status];
                        return (
                            <li key={branch.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-label-md text-label-md text-on-surface">{branch.name}</p>
                                    <p className="mt-1 flex items-start gap-2 text-body-sm text-on-surface-variant"><MapPin aria-hidden="true" size={15} className="mt-0.5 shrink-0" />{branch.location}</p>
                                    {branch.contactNumber ? (
                                        <a href={`tel:${branch.contactNumber}`} className="mt-2 inline-flex min-h-11 items-center gap-2 font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><Phone aria-hidden="true" size={15} />{branch.contactNumber}</a>
                                    ) : null}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                                    <span className="min-w-28 text-right font-label-md text-label-md text-primary">{branch.pricePerPack === null ? "Call branch for price" : formatMwk(branch.pricePerPack)}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>
            <PublicFooter branches={branches} />
        </main>
    );
}