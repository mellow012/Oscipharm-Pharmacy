export default function StaffCatalogLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
            <header className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                    <div className="h-4 w-28 bg-border/40 animate-pulse" />
                    <div className="h-12 w-72 bg-border/40 animate-pulse" />
                </div>
                <div className="h-10 w-48 bg-border/40 animate-pulse" />
            </header>
            <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="h-12 border border-border bg-border/40 animate-pulse" />
                    <div className="h-12 border border-border bg-border/40 animate-pulse" />
                    <div className="h-12 border border-border bg-border/40 animate-pulse" />
                    <div className="h-12 border border-border bg-border/40 animate-pulse" />
                </aside>
                <section>
                    <div className="mb-5 flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="h-16 w-full max-w-xl bg-border/40 animate-pulse" />
                        <div className="h-10 w-48 bg-border/40 animate-pulse" />
                    </div>
                    <div className="mb-4 h-10 border-b border-border bg-border/40 animate-pulse" />
                    <div className="space-y-4">
                        <div className="h-28 border border-border bg-border/40 animate-pulse" />
                        <div className="h-28 border border-border bg-border/40 animate-pulse" />
                        <div className="h-28 border border-border bg-border/40 animate-pulse" />
                    </div>
                </section>
            </div>
        </div>
    );
}