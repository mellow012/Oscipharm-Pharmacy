import Link from "next/link";
import { getCatalogBrowserData } from "@/features/catalog/lib/queries";
import { ProductBrowser } from "@/features/catalog/components/ProductBrowser";

export const dynamic = 'force-dynamic';
export default async function CatalogPage() {
  const { categories, products } = await getCatalogBrowserData();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
      <nav className="flex items-center justify-between border-b border-border pb-5">
        <Link href="/" className="font-display text-2xl text-ink">OsciPharm</Link>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-warn">Product catalog</span>
      </nav>
      <header className="grid gap-8 border-b border-border py-12 md:grid-cols-[1fr_0.7fr] md:items-end md:py-16">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-warn">Browse by category</p>
          <h1 className="max-w-2xl text-5xl leading-[0.98] text-ink sm:text-6xl">Everyday essentials, clearly organized.</h1>
        </div>
        <p className="max-w-sm text-lg leading-8 text-muted">
          Explore our range by category, then narrow in on the ingredient and brand that suits you.
        </p>
      </header>
      <section className="py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between border-b border-border pb-4">
          <h2 className="text-2xl text-ink">Categories</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{categories.length.toString().padStart(2, "0")} available</span>
        </div>
        <ProductBrowser categories={categories} products={products} />
      </section>
    </main>
  );
}
