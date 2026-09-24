import Link from "next/link";

export default function UnauthorizedPage() {
    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
            <section className="w-full max-w-xl border border-border bg-surface p-8 sm:p-12">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Access restricted</p>
                <h1 className="mt-4 text-5xl leading-none text-ink">You cannot open this workspace.</h1>
                <p className="mt-5 max-w-md text-lg leading-8 text-muted">Your account does not have permission to view this area. Return to your staff home to continue.</p>
                <Link href="/staff" className="mt-8 inline-flex bg-primary px-5 py-3 font-semibold text-primary-fg transition hover:bg-ink">Back to staff home</Link>
            </section>
        </main>
    );
}