import Link from "next/link";

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
            <section className="w-full max-w-xl border border-border bg-surface p-8 sm:p-12">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Not found</p>
                <h1 className="mt-4 text-4xl text-ink">Page not found</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-muted">This page may have moved or is no longer available.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/" className="bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">Public home</Link>
                    <Link href="/staff" className="inline-flex items-center border border-border px-5 py-3 font-semibold text-ink transition hover:bg-chip">Staff home</Link>
                </div>
            </section>
        </main>
    );
}
