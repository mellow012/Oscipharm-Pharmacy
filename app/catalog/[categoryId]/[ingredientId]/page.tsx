import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VariantList } from "@/features/catalog/components/VariantList";
import { getPublicBranches, getPublicVariants } from "@/features/catalog/lib/queries";
import { PublicFooter } from "@/features/marketing/components/PublicFooter";
import { SiteHeader } from "@/features/marketing/components/SiteHeader";
import { prisma } from "@/lib/prisma";

export default async function IngredientPage({ params }: { params: Promise<{ categoryId: string; ingredientId: string }> }) {
    const { categoryId, ingredientId } = await params;
    const [variants, ingredient, branches] = await Promise.all([
        getPublicVariants(ingredientId),
        prisma.ingredient.findUnique({
            where: { id: ingredientId },
            select: { id: true, name: true, categoryId: true, category: { select: { id: true, name: true } } },
        }),
        getPublicBranches(),
    ]);

    if (!ingredient || !ingredient.category || ingredient.categoryId !== categoryId) {
        return <div>Ingredient not found</div>;
    }

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <SiteHeader />
            <nav aria-label="Breadcrumb" className="flex min-h-11 flex-wrap items-center gap-2 border-b border-outline-variant text-body-sm text-on-surface-variant">
                <Link href="/catalog" className="inline-flex min-h-11 items-center hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Catalog</Link>
                <span aria-hidden="true">/</span>
                <Link href={`/catalog/${categoryId}`} className="inline-flex min-h-11 items-center hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">{ingredient.category.name}</Link>
                <span aria-hidden="true">/</span>
                <span aria-current="page" className="font-label-md text-label-md text-on-surface">{ingredient.name}</span>
            </nav>
            <header className="border-b border-outline-variant py-7 sm:py-9">
                <p className="font-eyebrow text-eyebrow uppercase text-secondary">Available products</p>
                <h1 className="mt-2 font-display text-headline-xl text-primary">{ingredient.name}</h1>
                <p className="mt-3 max-w-xl text-body-md text-on-surface-variant">Compare brands, pack sizes, and branch availability.</p>
                <Link href={`/catalog/${categoryId}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-label-md text-label-md font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <ArrowLeft aria-hidden="true" size={16} />Back to {ingredient.category.name}
                </Link>
            </header>
            <section aria-labelledby="variants-heading" className="py-7 sm:py-9">
                <h2 id="variants-heading" className="mb-4 font-display text-headline-md text-ink">Pack sizes and prices</h2>
                <VariantList variants={variants} />
            </section>
            <PublicFooter branches={branches} />
        </main>
    );
}