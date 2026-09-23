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
    <main className="p-4">
      <div className="flex items-center mb-4 gap-2 text-sm text-muted">
        <Link href="/catalog" className="hover:underline">Catalog</Link>
        <span>/</span>
        <span className="font-medium text-fg">{category.name}</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{category.name} Ingredients</h1>
      <div className="flex flex-col gap-2">
        {ingredients.map((ing) => (
          <Link
            key={ing.id}
            href={`/catalog/${category.id}/${ing.id}`}
            className="p-3 rounded-lg border border-border bg-surface hover:bg-chip transition-colors"
          >
            {ing.name}
          </Link>
        ))}
        {ingredients.length === 0 && <p className="text-muted">No ingredients found.</p>}
      </div>
    </main>
  );
}
