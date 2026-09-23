import Link from "next/link";
import { Category } from "@prisma/client";

export function CategoryNav({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 p-4">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/catalog/${c.id}`}
          className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-surface hover:bg-chip transition-colors"
        >
          <span className="font-medium text-fg mt-2">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
