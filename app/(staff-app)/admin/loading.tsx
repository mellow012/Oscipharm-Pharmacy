export default function AdminLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <header className="flex flex-col gap-4 border-b border-border py-10 sm:flex-row sm:items-end sm:justify-between sm:py-14">
                <div className="space-y-3">
                    <div className="h-4 w-32 bg-border/40 animate-pulse" />
                    <div className="h-14 w-80 max-w-full bg-border/40 animate-pulse" />
                    <div className="h-6 w-96 max-w-full bg-border/40 animate-pulse" />
                </div>
                <div className="flex gap-3">
                    <div className="h-12 w-32 bg-border/40 animate-pulse" />
                    <div className="h-12 w-44 bg-border/40 animate-pulse" />
                </div>
            </header>
            <section className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4">
                <div className="h-28 border-b border-border bg-border/40 sm:border-r lg:border-b-0 animate-pulse" />
                <div className="h-28 border-b border-border bg-border/40 lg:border-b-0 animate-pulse" />
                <div className="h-28 border-b border-border bg-border/40 sm:border-r lg:border-b-0 animate-pulse" />
                <div className="h-28 bg-border/40 animate-pulse" />
            </section>
            <div className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
                <section>
                    <div className="mb-5 h-10 border-b border-border bg-border/40 animate-pulse" />
                    <div className="space-y-5 border-y border-border">
                        <div className="h-20 bg-border/40 animate-pulse" />
                        <div className="h-20 bg-border/40 animate-pulse" />
                        <div className="h-20 bg-border/40 animate-pulse" />
                    </div>
                </section>
                <section>
                    <div className="mb-5 h-10 border-b border-border bg-border/40 animate-pulse" />
                    <div className="space-y-4 border-y border-border">
                        <div className="h-20 bg-border/40 animate-pulse" />
                        <div className="h-20 bg-border/40 animate-pulse" />
                        <div className="h-20 bg-border/40 animate-pulse" />
                    </div>
                </section>
            </div>
        </div>
    );
}