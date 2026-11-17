import Link from "next/link";
import Image from "next/image";
import { ProductBrowser } from "@/features/catalog/components/ProductBrowser";
import { getCatalogBrowserData } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const { categories, products, branches } = await getCatalogBrowserData();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <header className="mt-6 overflow-hidden border-y border-outline-variant bg-surface">
                <Image
                    src="/op/hero-image.png"
                    alt="OsciPharm Pharmacy hero artwork showing a pharmacist serving a customer"
                    width={2048}
                    height={1152}
                    priority
                    sizes="(max-width: 640px) 100vw, 1152px"
                    className="h-auto w-full"
                />
            </header>
            <div className="flex flex-col gap-4 border-b border-border py-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-6 text-muted">Find everyday medicines and trusted essentials across the OsciPharm branch network.</p>
                <Link href="/catalog" className="inline-flex w-fit items-center gap-3 bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">
                    Browse the catalog <span aria-hidden="true">-&gt;</span>
                </Link>
            </div>
            <ProductBrowser categories={categories} products={products} branches={branches} />
            <PublicFooter branches={branches} />
        </main>
    );
}
