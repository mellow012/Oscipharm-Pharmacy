import Link from "next/link";
import { getBranches } from "@/features/marketing/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const branches = await getBranches();

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
            <header className="border-b border-border pb-10">
                <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm</p>
                <h1 className="max-w-2xl text-5xl leading-tight text-ink">Medicines, made easier to find.</h1>
                <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
                    Browse our catalog and find the products available across our pharmacy branches.
                </p>
                <div className="mt-8 flex items-center gap-6">
                    <Link href="/catalog" className="bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">
                        Browse the catalog
                    </Link>
                    <Link href="/login" className="text-sm text-muted underline decoration-warn underline-offset-4 hover:text-primary">
                        Staff sign in
                    </Link>
                </div>
            </header>
            <section className="py-10">
                <div className="mb-5 flex items-baseline justify-between gap-4">
                    <h2 className="text-2xl text-ink">Our branches</h2>
                    <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted">Visit us</span>
                </div>
                {branches.length > 0 ? (
                    <ul className="border-y border-border">
                        {branches.map((branch) => (
                            <li key={branch.name} className="border-b border-border border-l-4 border-warn bg-surface px-5 py-4 last:border-b-0">
                                <p className="font-medium text-ink">{branch.name}</p>
                                {branch.location ? <p className="mt-1 text-sm text-muted">{branch.location}</p> : null}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="border border-dashed border-border px-5 py-6 text-muted">Branch information is not available yet.</p>
                )}
            </section>
        </main>
    );
}
