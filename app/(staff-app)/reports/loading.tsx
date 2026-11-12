export default function ReportsLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mt-5 h-10 border border-border bg-border/40 animate-pulse" />
            <div className="border-b border-border py-8">
                <div className="h-4 w-24 bg-border/40 animate-pulse" />
                <div className="mt-3 h-12 w-2/3 bg-border/40 animate-pulse" />
                <div className="mt-3 h-5 w-1/2 bg-border/40 animate-pulse" />
            </div>
            <section className="py-6">
                <div className="grid gap-4 rounded border border-border bg-surface p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-16 bg-border/40 animate-pulse" />
                    <div className="h-10 w-24 self-end bg-border/40 animate-pulse" />
                </div>
            </section>
            <section className="mb-8 grid border-y border-border sm:grid-cols-2 lg:grid-cols-5">
                <div className="h-24 border-b border-border bg-border/40 sm:border-r lg:border-b-0" />
                <div className="h-24 border-b border-border bg-border/40 sm:border-r lg:border-b-0" />
                <div className="h-24 border-b border-border bg-border/40 sm:border-r lg:border-b-0" />
                <div className="h-24 border-b border-border bg-border/40 sm:border-r lg:border-b-0" />
                <div className="h-24 bg-border/40" />
            </section>
            <section className="mb-8 grid gap-8 lg:grid-cols-2">
                <div className="h-64 border border-border bg-border/40 animate-pulse" />
                <div className="h-64 border border-border bg-border/40 animate-pulse" />
            </section>
            <div className="mb-8 h-72 border border-border bg-border/40 animate-pulse" />
            <div className="h-64 border border-border bg-border/40 animate-pulse" />
        </div>
    );
}
