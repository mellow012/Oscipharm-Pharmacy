export default function StaffSalesLoading() {
    return (
        <div aria-hidden="true" className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <div className="mt-5 h-10 border border-border bg-border/40 animate-pulse" />
            <div className="border-b border-border py-8">
                <div className="h-4 w-24 bg-border/40 animate-pulse" />
                <div className="mt-3 h-12 w-2/3 bg-border/40 animate-pulse" />
            </div>
            <div className="grid gap-3 border-b border-border py-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr_auto]">
                <div className="h-16 bg-border/40 animate-pulse" />
                <div className="h-16 bg-border/40 animate-pulse" />
                <div className="h-16 bg-border/40 animate-pulse" />
                <div className="h-16 bg-border/40 animate-pulse" />
                <div className="h-10 w-24 self-end bg-border/40 animate-pulse" />
            </div>
            <section className="grid border-b border-border sm:grid-cols-3">
                <div className="h-20 border-b border-border bg-border/40 sm:border-b-0 sm:border-r animate-pulse" />
                <div className="h-20 border-b border-border bg-border/40 sm:border-b-0 sm:border-r animate-pulse" />
                <div className="h-20 bg-border/40 animate-pulse" />
            </section>
            <div className="mt-5 h-80 border-y border-border bg-border/40 animate-pulse" />
        </div>
    );
}
