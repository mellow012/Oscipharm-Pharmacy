import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getIngredients, getPublicBranches } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";
import { prisma } from "@/lib/prisma";

export default async function CategoryPage({ params }: { params: Promise<{ categoryId: string }> }) {
    const { categoryId } = await params;
    const [ingredients, category, branches] = await Promise.all([
        getIngredients(categoryId),
        prisma.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } }),
        getPublicBranches(),
    ]);

    if (!category) return <div>Category not found</div>;

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <nav aria-label="Breadcrumb" className="flex min-h-11 items-center gap-2 border-b border-outline-variant text-body-sm text-on-surface-variant">
                <Link href="/catalog" className="inline-flex min-h-11 items-center hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Catalog</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="font-label-md text-label-md text-on-surface">{category.name}</span>
            </nav>
            <header className="border-b border-outline-variant py-7 sm:py-9">
                <p className="font-eyebrow text-eyebrow uppercase text-secondary">Category</p>
                <h1 className="mt-2 font-display text-headline-xl text-primary">{category.name}</h1>
                <p className="mt-3 max-w-xl text-body-md text-on-surface-variant">Choose an ingredient to compare the available brands and strengths.</p>
            </header>
            <section className="py-7 sm:py-9" aria-labelledby="ingredients-heading">
                <h2 id="ingredients-heading" className="mb-4 font-display text-headline-md text-ink">Ingredients</h2>
                {ingredients.length ? (
                    <ul className="border-y border-outline-variant">
                        {ingredients.map((ingredient) => (
                            <li key={ingredient.id} className="border-b border-outline-variant last:border-b-0">
                                <Link href={`/catalog/${category.id}/${ingredient.id}`} className="group flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary">
                                    <span className="font-display text-headline-sm text-ink group-hover:text-primary">{ingredient.name}</span>
                                    <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-secondary" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : <p className="border border-dashed border-outline-variant px-5 py-6 text-body-md text-on-surface-variant">No ingredients found.</p>}
            </section>
            <PublicFooter branches={branches} />
        </main>
    );
}