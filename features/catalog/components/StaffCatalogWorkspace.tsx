"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  StaffCatalogCategory,
  StaffCatalogUncategorizedVariant,
} from "@/features/catalog/types";
import {
  StaffCatalogWorkspaceView,
  type CatalogCategorySummary,
} from "@/features/catalog/components/StaffCatalogWorkspaceView";
import type {
  StaffCatalogIngredientGroup,
  StaffCatalogVariantRow,
} from "@/features/catalog/components/StaffCatalogVariantList";
import { getPageNumbers } from "@/features/shared/lib/page-range";

export function StaffCatalogWorkspace({
  categories,
  uncategorizedVariants,
  branchId,
  branches,
  role,
  canManage,
}: {
  categories: StaffCatalogCategory[];
  uncategorizedVariants: StaffCatalogUncategorizedVariant[];
  branchId: string;
  branches: Array<{ id: string; name: string }>;
  role: "ADMIN" | "BRANCH_MANAGER" | "POS";
  canManage: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [creatingVariant, setCreatingVariant] = useState(false);

  const rawCategory = searchParams.get("category") ?? "all";
  const searchText = searchParams.get("query") ?? "";
  const notLinkedOnly = searchParams.get("notLinked") === "1";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const currentCategory =
    rawCategory === "all" || rawCategory === "uncategorized" ? rawCategory : rawCategory;

  const allRows = useMemo<StaffCatalogVariantRow[]>(
    () => [
      ...categories.flatMap((category) =>
        category.ingredients.flatMap((ingredient) =>
          ingredient.variants.map((variant) => ({
            id: variant.id,
            categoryId: category.id,
            categoryName: category.name,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            brandName: variant.brandName,
            strength: variant.strength,
            packSize: variant.packSize,
            unitLabel: variant.unitLabel,
            allowsLooseSale: variant.allowsLooseSale,
            isActive: variant.isActive,
            pricePerPack: variant.pricePerPack,
            pricePerUnit: variant.pricePerUnit,
            stock: variant.stock,
            aroniumProductLinks: variant.aroniumProductLinks,
          })),
        ),
      ),
      ...uncategorizedVariants.map((variant) => ({
        id: variant.id,
        categoryId: null,
        categoryName: null,
        ingredientId: variant.ingredient?.id ?? null,
        ingredientName: variant.ingredient?.name ?? null,
        brandName: variant.brandName,
        strength: variant.strength,
        packSize: variant.packSize,
        unitLabel: variant.unitLabel,
        allowsLooseSale: variant.allowsLooseSale,
        isActive: variant.isActive,
        pricePerPack: variant.pricePerPack,
        pricePerUnit: variant.pricePerUnit,
        stock: variant.stock,
        aroniumProductLinks: variant.aroniumProductLinks,
      })),
    ],
    [categories, uncategorizedVariants],
  );

  const categorySummaries = useMemo<CatalogCategorySummary[]>(() => {
    const result = [{ id: "all", name: "All", count: allRows.length }];
    categories.forEach((category) => {
      result.push({
        id: category.id,
        name: category.name,
        count: category.ingredients.reduce(
          (total, ingredient) => total + ingredient.variants.length,
          0,
        ),
      });
    });
    if (uncategorizedVariants.length > 0) {
      result.push({
        id: "uncategorized",
        name: "Uncategorized",
        count: uncategorizedVariants.length,
      });
    }
    return result;
  }, [allRows.length, categories, uncategorizedVariants.length]);

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return allRows.filter((row) => {
      if (search) {
        const haystack = [
          row.ingredientName ?? "",
          row.brandName,
          row.strength ?? "",
          row.categoryName ?? "",
          ...row.aroniumProductLinks.map((link) => `${link.aroniumCode} ${link.mode}`),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      } else if (currentCategory === "uncategorized") {
        if (row.categoryId !== null) return false;
      } else if (currentCategory !== "all" && row.categoryId !== currentCategory) {
        return false;
      }
      if (notLinkedOnly && row.aroniumProductLinks.length > 0) return false;
      return true;
    });
  }, [allRows, currentCategory, notLinkedOnly, searchText]);

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const page = Math.min(
    Math.max(Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1, 1),
    pageCount,
  );

  useEffect(() => {
    if (page !== pageParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(page));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [page, pageParam, pathname, router, searchParams]);

  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const selectedVariant = allRows.find((row) => row.id === selectedVariantId) ?? null;

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    if (!params.has("page") && !updates.page) params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const ingredientGroups = useMemo(() => {
    const groups = new Map<string, StaffCatalogIngredientGroup>();
    visibleRows.forEach((row) => {
      const key = `${row.categoryId ?? "uncategorized"}:${row.ingredientId ?? row.id}`;
      const group = groups.get(key) ?? {
        ingredientName: row.ingredientName ?? row.brandName,
        categoryName: row.categoryName ?? "Uncategorized",
        rows: [],
      };
      group.rows.push(row);
      groups.set(key, group);
    });
    return Array.from(groups.values()).sort((a, b) =>
      a.ingredientName.localeCompare(b.ingredientName),
    );
  }, [visibleRows]);

  const hrefForPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    return `${pathname}?${params.toString()}`;
  };

  return (
    <StaffCatalogWorkspaceView
      categories={categories}
      branches={branches}
      branchId={branchId}
      role={role}
      canManage={canManage}
      currentCategory={currentCategory}
      categorySummaries={categorySummaries}
      onCategoryChange={(categoryId) => updateParams({ category: categoryId, page: "1" })}
      searchText={searchText}
      onSearchChange={(value) => updateParams({ query: value.trim() || null, page: "1" })}
      notLinkedOnly={notLinkedOnly}
      onNotLinkedToggle={() => updateParams({ notLinked: notLinkedOnly ? null : "1", page: "1" })}
      filteredCount={filteredRows.length}
      page={page}
      pageCount={pageCount}
      pageNumbers={getPageNumbers(page, pageCount)}
      rangeStart={filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1}
      rangeEnd={Math.min(page * pageSize, filteredRows.length)}
      hrefForPage={hrefForPage}
      ingredientGroups={ingredientGroups}
      onSelect={setSelectedVariantId}
      selectedVariant={selectedVariant}
      creatingVariant={creatingVariant}
      selectedVariantId={selectedVariantId}
      onAdd={() => {
        setSelectedVariantId(null);
        setCreatingVariant(true);
      }}
      onSaved={(variantId) => {
        setCreatingVariant(false);
        setSelectedVariantId(variantId);
        router.refresh();
      }}
      onClose={() => {
        setSelectedVariantId(null);
        setCreatingVariant(false);
      }}
    />
  );
}
