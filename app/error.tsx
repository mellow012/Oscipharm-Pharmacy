"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
            <section className="w-full max-w-xl border border-border bg-surface p-8 sm:p-12">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Unexpected error</p>
                <h1 className="mt-4 text-4xl text-ink">Something went wrong</h1>
                <p className="mt-5 max-w-md text-base leading-7 text-muted">We couldn&apos;t load this page. Try again, or return to your staff home.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <button type="button" onClick={reset} className="bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">Try again</button>
                    <Link href="/staff" className="inline-flex items-center border border-border px-5 py-3 font-semibold text-ink transition hover:bg-chip">Staff home</Link>
                </div>
            </section>
        </main>
    );
}
