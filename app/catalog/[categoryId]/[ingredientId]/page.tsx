import Link from "next/link";
import { getVariants } from "@/features/catalog/lib/queries";
import { prisma } from "@/lib/prisma";
import { VariantList } from "@/features/catalog/components/VariantList";

export default async function IngredientPage({
  params,
}: {
  params: Promise<{ categoryId: string; ingredientId: string }>;
}) {
  const { categoryId, ingredientId } = await params;
  const variants = await getVariants(ingredientId);
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    include: { category: true },
  });

  if (!ingredient || ingredient.categoryId !== categoryId) {
    return <div>Ingredient not found</div>;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center gap-2 border-b border-border pb-5 text-sm text-muted">
        <Link href="/catalog" className="hover:text-primary">Catalog</Link>
        <span>/</span>
        <Link href={`/catalog/${categoryId}`} className="hover:text-primary">{ingredient.category.name}</Link>
        <span>/</span>
        <span className="font-medium text-fg">{ingredient.name}</span>
      </div>
      <header className="border-b border-border py-12">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-warn">Available products</p>
        <h1 className="text-5xl text-ink">{ingredient.name}</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">Compare brands and strengths currently listed in the OsciPharm catalog.</p>
      </header>
      <section className="py-10">
        <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
          <h2 className="text-2xl text-ink">Variants</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{variants.length.toString().padStart(2, "0")} found</span>
        </div>
        <VariantList variants={variants} />
      </section>
    </main>
  );
}
