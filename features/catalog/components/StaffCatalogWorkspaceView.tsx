"use client";

import { Filter, Plus } from "lucide-react";
import type { StaffCatalogCategory } from "@/features/catalog/types";
import type {
  StaffCatalogIngredientGroup,
  StaffCatalogVariantRow,
} from "@/features/catalog/components/StaffCatalogVariantList";
import { StaffCatalogDetailSheet } from "@/features/catalog/components/StaffCatalogDetailSheet";
import { StaffCatalogSidebar } from "@/features/catalog/components/StaffCatalogSidebar";
import { StaffCatalogVariantList } from "@/features/catalog/components/StaffCatalogVariantList";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";
import { LinkPagination } from "@/features/shared/components/LinkPagination";
import { PageHeader } from "@/features/shared/components/PageHeader";
import type { PageNumber } from "@/features/shared/lib/page-range";

export type CatalogCategorySummary = { id: string; name: string; count: number };

export function StaffCatalogWorkspaceView({
  categories,
  branches,
  branchId,
  role,
  canManage,
  currentCategory,
  categorySummaries,
  onCategoryChange,
  searchText,
  onSearchChange,
  notLinkedOnly,
  onNotLinkedToggle,
  linkedCount,
  unlinkedCount,
  filteredCount,
  page,
  pageCount,
  pageNumbers,
  rangeStart,
  rangeEnd,
  hrefForPage,
  ingredientGroups,
  onSelect,
  selectedVariant,
  creatingVariant,
  selectedVariantId,
  onAdd,
  onSaved,
  onClose,
}: {
  categories: StaffCatalogCategory[];
  branches: Array<{ id: string; name: string }>;
  branchId: string;
  role: "ADMIN" | "BRANCH_MANAGER" | "POS";
  canManage: boolean;
  currentCategory: string;
  categorySummaries: CatalogCategorySummary[];
  onCategoryChange: (id: string) => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  notLinkedOnly: boolean;
  onNotLinkedToggle: () => void;
  linkedCount: number;
  unlinkedCount: number;
  filteredCount: number;
  page: number;
  pageCount: number;
  pageNumbers: PageNumber[];
  rangeStart: number;
  rangeEnd: number;
  hrefForPage: (page: number) => string;
  ingredientGroups: StaffCatalogIngredientGroup[];
  onSelect: (id: string) => void;
  selectedVariant: StaffCatalogVariantRow | null;
  creatingVariant: boolean;
  selectedVariantId: string | null;
  onAdd: () => void;
  onSaved: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <PageHeader
        eyebrow="Staff catalog"
        title="Catalog overview"
        actions={
          <>
            {role === "ADMIN" && branches.length > 0 ? (
              <FormField id="catalog-branch" label="Branch">
                {(fieldProps) => (
                  <FormSelect
                    {...fieldProps}
                    defaultValue={branchId}
                    onChange={(event) => {
                      const next = event.target.value;
                      if (next)
                        window.location.href = `/staff/catalog?branchId=${encodeURIComponent(next)}`;
                    }}
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </FormSelect>
                )}
              </FormField>
            ) : null}
            {canManage ? (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex min-h-11 items-center gap-space-sm bg-primary px-space-md font-label-md text-label-md text-on-primary hover:bg-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Plus aria-hidden="true" size={17} />
                Add variant
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid min-w-0 gap-space-lg min-[1200px]:grid-cols-[220px_minmax(0,1fr)]">
        <StaffCatalogSidebar
          categories={categorySummaries}
          selectedCategory={currentCategory}
          onSelect={onCategoryChange}
        />

        <section className="min-w-0">
          <div className="mb-space-md flex min-w-0 flex-col gap-space-md border-b border-outline-variant pb-space-md lg:flex-row lg:items-end lg:justify-between">
            <FormField id="catalog-search" label="Search catalog">
              {(fieldProps) => (
                <FormInput
                  {...fieldProps}
                  type="search"
                  value={searchText}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Ingredient, brand, strength or Aronium code"
                  className={`${fieldProps.className} max-w-xl`}
                />
              )}
            </FormField>
            <div className="flex min-w-0 flex-wrap items-end gap-space-md">
              <p className="pb-space-sm font-body-sm text-body-sm tabular-nums text-on-surface-variant">
                Linked: {linkedCount} · Not linked: {unlinkedCount}
              </p>
              <button
                type="button"
                onClick={onNotLinkedToggle}
                aria-pressed={notLinkedOnly}
                className={`inline-flex min-h-11 items-center justify-center gap-space-sm border px-space-md font-label-sm text-label-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${notLinkedOnly ? "border-primary bg-primary text-on-primary" : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"}`}
              >
                <Filter aria-hidden="true" size={15} />
                Not linked to Aronium
              </button>
            </div>
          </div>

          {filteredCount === 0 ? (
            <div className="border border-dashed border-outline-variant bg-surface-container-lowest p-space-xl text-center">
              <p className="font-headline-sm text-headline-sm text-primary">
                {searchText
                  ? "No variants match your search."
                  : notLinkedOnly
                    ? "Every variant in this view is linked to Aronium."
                    : currentCategory !== "all"
                      ? "No variants in this category yet."
                      : "No variants in the catalog yet."}
              </p>
              <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
                {searchText
                  ? "Try another ingredient, brand, strength or Aronium code."
                  : notLinkedOnly
                    ? "Clear the filter to view linked variants."
                    : currentCategory !== "all"
                      ? "This category does not currently contain any variants."
                      : "Add a variant to get started."}
              </p>
            </div>
          ) : (
            <>
              <LinkPagination
                page={page}
                pageCount={pageCount}
                total={filteredCount}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                pages={pageNumbers}
                hrefForPage={hrefForPage}
              />
              <div className="mt-space-md">
                <StaffCatalogVariantList
                  groups={ingredientGroups}
                  searchText={searchText}
                  onSelect={onSelect}
                />
              </div>
            </>
          )}
        </section>
      </div>

      {selectedVariant || creatingVariant || selectedVariantId !== null ? (
        <StaffCatalogDetailSheet
          variant={selectedVariant}
          branchId={branchId}
          categories={categories}
          canManage={canManage}
          onSaved={onSaved}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
}
