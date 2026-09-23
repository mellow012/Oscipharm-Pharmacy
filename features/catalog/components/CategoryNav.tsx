import Link from "next/link";
import { Category } from "@prisma/client";

export function CategoryNav({ categories }: { categories: Category[] }) {
  return (
    <div className="border-y border-border">
      {categories.map((c, index) => (
        <Link
          key={c.id}
          href={`/catalog/${c.id}`}
          className="group grid grid-cols-[3rem_1fr_auto] items-center gap-5 border-b border-border py-6 last:border-b-0 hover:bg-surface"
        >
          <span className="font-mono text-xs text-warn">0{index + 1}</span>
          <span>
            <span className="block font-display text-3xl text-ink transition group-hover:text-primary">{c.name}</span>
            <span className="mt-1 block text-sm text-muted">Browse available {c.name.toLowerCase()} products</span>
          </span>
          <span aria-hidden="true" className="text-xl text-warn transition-transform group-hover:translate-x-1">-&gt;</span>
        </Link>
      ))}
    </div>
  );
}
