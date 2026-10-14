type CategorySummary = {
    id: string;
    name: string;
    count: number;
};

export function StaffCatalogSidebar({
    categories,
    selectedCategory,
    onSelect,
}: {
    categories: CategorySummary[];
    selectedCategory: string;
    onSelect: (categoryId: string) => void;
}) {
    return (
        <aside className="w-full xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-[260px]">
            <div className="rounded border border-border bg-white p-3 shadow-sm xl:h-full xl:overflow-y-auto">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">Categories</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0">
                    {categories.map((category) => {
                        const isSelected = selectedCategory === category.id;
                        return (
                            <button
                                key={category.id}
                                type="button"
                                onClick={() => onSelect(category.id)}
                                className={`shrink-0 rounded-full border px-3 py-2 text-left text-sm transition xl:w-full ${
                                    isSelected
                                        ? "border-primary bg-primary text-primary-fg shadow-sm"
                                        : "border-border bg-surface text-ink hover:border-primary/40 hover:text-primary"
                                }`}
                            >
                                <span className="flex items-center justify-between gap-3">
                                    <span>{category.name}</span>
                                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.08em] opacity-80">{category.count}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
