import { BranchDirectory } from "@/features/catalog/components/BranchDirectory";
import { ProductBrowser } from "@/features/catalog/components/ProductBrowser";
import { getCatalogBrowserData } from "@/features/catalog/lib/queries";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";
import { formatBlantyreDateTime } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
    const { categories, products, branches, availabilityUpdatedAt } = await getCatalogBrowserData();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <header className="grid gap-3 border-b border-outline-variant py-7 sm:py-9 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                    <p className="font-eyebrow text-eyebrow uppercase text-secondary">Browse the OsciPharm range</p>
                    <h1 className="mt-2 max-w-2xl font-display text-headline-xl text-primary">Everyday essentials, clearly organized.</h1>
                    <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">Explore our range by category, then narrow in on the ingredient and brand that suits you.</p>
                </div>
            </header>
            {availabilityUpdatedAt ? (
                <p className="pt-4 font-body-sm text-body-sm text-on-surface-variant">
                    Availability updated {formatBlantyreDateTime(availabilityUpdatedAt)} CAT
                </p>
            ) : null}
            <ProductBrowser categories={categories} products={products} />
            <BranchDirectory branches={branches} />
        </main>
    );
}