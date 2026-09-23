import { getCategories } from "@/features/catalog/lib/queries";
import { CategoryNav } from "@/features/catalog/components/CategoryNav";

export const dynamic = 'force-dynamic';
export default async function CatalogPage() {
  const categories = await getCategories();

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Catalog</h1>
      <CategoryNav categories={categories} />
    </main>
  );
}
