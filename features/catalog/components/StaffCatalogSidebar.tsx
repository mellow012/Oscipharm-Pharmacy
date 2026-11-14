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
    <aside className="min-w-0 w-full min-[1200px]:sticky min-[1200px]:top-20 min-[1200px]:h-[calc(100vh-6rem)]">
      <div className="min-w-0 border border-outline-variant bg-surface-container-lowest p-space-sm min-[1200px]:h-full min-[1200px]:overflow-y-auto">
        <div className="mb-space-sm flex items-center justify-between border-b border-outline-variant px-space-xs pb-space-sm">
          <h2 className="font-table-header text-table-header uppercase text-on-surface-variant">
            Categories
          </h2>
        </div>
        <div className="flex min-w-0 gap-space-xs overflow-x-auto pb-space-xs min-[1200px]:flex-col min-[1200px]:overflow-visible min-[1200px]:pb-0">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelect(category.id)}
                className={`min-h-11 shrink-0 border px-space-sm py-space-sm text-left font-body-sm text-body-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-[1200px]:w-full ${
                  isSelected
                    ? "border-primary bg-primary text-on-primary"
                    : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{category.name}</span>
                  <span className="tabular-nums opacity-80">{category.count}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
