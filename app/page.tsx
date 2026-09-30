import Link from "next/link";
import Image from "next/image";
import { ProductBrowser } from "@/features/catalog/components/ProductBrowser";
import { getCatalogBrowserData } from "@/features/catalog/lib/queries";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const { categories, products } = await getCatalogBrowserData();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <header className="relative left-1/2 mt-6 w-screen -translate-x-1/2 border-y border-border bg-surface">
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
            <ProductBrowser categories={categories} products={products} />
            <footer className="mt-10 border-t border-border pt-10 sm:mt-14 sm:pt-14">
                <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr_0.9fr]">
                    <div>
                        <Image src="/op/logo-transparent.png" alt="OsciPharm Pharmacy" width={126} height={50} className="h-10 w-auto object-contain object-left" />
                        <p className="mt-5 max-w-xs text-sm leading-6 text-muted">Good Chemistry. Good Health. Everyday care, thoughtfully stocked.</p>
                    </div>
                    <div>
                        <div className="mb-4 flex items-baseline justify-between gap-4">
                            <h2 className="text-2xl text-ink">Our branches</h2>
                            <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">01 location</span>
                        </div>
                        <ul className="border-y border-border">
                            <li className="grid grid-cols-[2rem_1fr] gap-3 py-3">
                                <span className="font-mono text-xs text-warn">01</span>
                                <div>
                                    <p className="font-medium text-ink">Blantyre Town Lunzu</p>
                                    <p className="mt-1 text-sm text-muted">Blantyre, Malawi</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <p className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-warn">Contact</p>
                        <div className="space-y-3 text-sm text-muted">
                            <a href="tel:+265996621085" className="block hover:text-primary">0996 62 10 85</a>
                            <a href="mailto:oscipharm@gmail.com" className="block hover:text-primary">oscipharm@gmail.com</a>
                            <a href="https://oscipharm.com" className="block hover:text-primary">oscipharm.com</a>
                        </div>
                        <p className="mt-6 border-l-2 border-warn bg-surface px-4 py-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                            Blantyre Town Lunzu
                        </p>
                    </div>
                </div>
                <div className="mt-10 border-t border-border py-5 font-mono text-xs uppercase tracking-[0.12em] text-muted">OsciPharm / Good Chemistry. Good Health.</div>
            </footer>
        </main>
    );
}
