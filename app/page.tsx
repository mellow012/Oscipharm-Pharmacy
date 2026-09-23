import Link from "next/link";
import { getBranches } from "@/features/marketing/lib/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const branches = await getBranches();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <nav className="flex items-center justify-between border-b border-border pb-5">
                <Link href="/" className="font-display text-2xl text-ink">OsciPharm</Link>
                <div className="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                    <Link href="/catalog" className="transition hover:text-primary">Catalog</Link>
                    <Link href="/login" className="border-b border-warn pb-1 transition hover:text-primary">Staff sign in</Link>
                </div>
            </nav>
            <header className="grid gap-10 border-b border-border py-14 md:grid-cols-[1.25fr_0.75fr] md:items-end md:py-20">
                <div>
                    <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-warn">Independent pharmacy network</p>
                    <h1 className="max-w-3xl text-5xl leading-[0.98] text-ink sm:text-7xl">The right care, close to home.</h1>
                </div>
                <div className="max-w-sm md:pb-1">
                    <p className="text-lg leading-8 text-muted">
                        Find everyday medicines and trusted essentials across the OsciPharm branch network.
                    </p>
                    <Link href="/catalog" className="mt-7 inline-flex items-center gap-3 bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">
                        Browse the catalog <span aria-hidden="true">-&gt;</span>
                    </Link>
                </div>
            </header>
            <section className="grid gap-8 py-10 md:grid-cols-[0.7fr_1.3fr] md:py-14">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-warn">Where to find us</p>
                    <h2 className="max-w-xs text-3xl leading-tight text-ink">Three branches, one familiar standard.</h2>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-muted">Visit the OsciPharm team in Lilongwe, Blantyre, or Mzuzu.</p>
                </div>
                {branches.length > 0 ? (
                    <ul className="border-y border-border">
                        {branches.map((branch, index) => (
                            <li key={branch.name} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 border-b border-border py-5 last:border-b-0">
                                <span className="font-mono text-xs text-warn">0{index + 1}</span>
                                <div>
                                    <p className="font-display text-2xl text-ink">{branch.name}</p>
                                    {branch.location ? <p className="mt-1 text-sm text-muted">{branch.location}</p> : null}
                                </div>
                                <span aria-hidden="true" className="text-lg text-warn">-&gt;</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="border border-dashed border-border px-5 py-6 text-muted">Branch information is not available yet.</p>
                )}
            </section>
            <footer className="border-t border-border py-5 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                OsciPharm / Everyday care, thoughtfully stocked
            </footer>
        </main>
    );
}
