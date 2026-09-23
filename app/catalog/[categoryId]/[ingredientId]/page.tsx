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
    <main className="p-4">
      <div className="flex items-center mb-4 gap-2 text-sm text-muted">
        <Link href="/catalog" className="hover:underline">Catalog</Link>
        <span>/</span>
        <Link href={`/catalog/${categoryId}`} className="hover:underline">{ingredient.category.name}</Link>
        <span>/</span>
        <span className="font-medium text-fg">{ingredient.name}</span>
      </div>
      <h1 className="text-2xl font-bold mb-4">{ingredient.name} Variants</h1>
      <VariantList variants={variants} />
    </main>
  );
}
