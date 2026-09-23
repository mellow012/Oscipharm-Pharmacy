import Link from "next/link";
import { getIngredients } from "@/features/catalog/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  const ingredients = await getIngredients(categoryId);
  const category = await prisma.category.findUnique({ where: { id: categoryId } });

  if (!category) return <div>Category not found</div>;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex items-center gap-2 border-b border-border pb-5 text-sm text-muted">
        <Link href="/catalog" className="hover:text-primary">Catalog</Link>
        <span>/</span>
        <span className="font-medium text-fg">{category.name}</span>
      </div>
      <header className="border-b border-border py-12">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-warn">Category</p>
        <h1 className="text-5xl text-ink">{category.name}</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">Choose an ingredient to compare the available brands and strengths.</p>
      </header>
      <section className="py-10">
        <div className="mb-5 flex items-end justify-between border-b border-border pb-4">
          <h2 className="text-2xl text-ink">Ingredients</h2>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{ingredients.length.toString().padStart(2, "0")} found</span>
        </div>
        <div className="border-y border-border">
        {ingredients.map((ing, index) => (
          <Link
            key={ing.id}
            href={`/catalog/${category.id}/${ing.id}`}
            className="group grid grid-cols-[3rem_1fr_auto] items-center gap-5 border-b border-border py-5 last:border-b-0 hover:bg-surface"
          >
            <span className="font-mono text-xs text-warn">0{index + 1}</span>
            <span className="font-display text-2xl text-ink transition group-hover:text-primary">{ing.name}</span>
            <span aria-hidden="true" className="text-xl text-warn">-&gt;</span>
          </Link>
        ))}
        {ingredients.length === 0 && <p className="px-5 py-6 text-muted">No ingredients found.</p>}
        </div>
      </section>
    </main>
  );
}
