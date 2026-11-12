export default function AdminStaffLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
            <section className="border border-border bg-surface p-5 sm:p-6">
                <div className="mb-5 h-16 border-b border-border bg-border/40 animate-pulse" />
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-10 w-36 bg-border/40 animate-pulse" />
                </div>
                <div className="mt-8 h-8 w-48 bg-border/40 animate-pulse" />
                <div className="mt-3 space-y-3">
                    <div className="h-24 border border-border bg-border/40 animate-pulse" />
                    <div className="h-24 border border-border bg-border/40 animate-pulse" />
                </div>
            </section>
            <section className="py-8">
                <div className="mb-6 h-20 border-b border-border bg-border/40 animate-pulse" />
                <div className="h-80 border-y border-border bg-border/40 animate-pulse" />
            </section>
        </div>
    );
}
