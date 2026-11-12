export default function InventoryLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <header className="flex flex-col gap-6 border-b border-border py-10 sm:flex-row sm:items-end sm:justify-between sm:py-14">
                <div className="space-y-3">
                    <div className="h-4 w-36 bg-border/40 animate-pulse" />
                    <div className="h-14 w-96 max-w-full bg-border/40 animate-pulse" />
                    <div className="h-6 w-80 max-w-full bg-border/40 animate-pulse" />
                </div>
                <div className="h-16 w-64 bg-border/40 animate-pulse" />
            </header>
            <section className="grid gap-8 py-10 lg:grid-cols-[1.35fr_0.65fr]">
                <div>
                    <div className="mb-5 h-14 border-b border-border bg-border/40 animate-pulse" />
                    <div className="mb-3 h-4 w-72 bg-border/40 animate-pulse" />
                    <div className="h-72 border-y border-border bg-border/40 animate-pulse" />
                </div>
                <div className="h-[420px] border border-border bg-border/40 animate-pulse" />
            </section>
            <section className="border-t border-border py-10">
                <div className="mb-5 h-16 border-b border-border bg-border/40 animate-pulse" />
                <div className="space-y-3 border-y border-border py-4">
                    <div className="h-20 bg-border/40 animate-pulse" />
                    <div className="h-20 bg-border/40 animate-pulse" />
                    <div className="h-20 bg-border/40 animate-pulse" />
                </div>
            </section>
        </div>
    );
}