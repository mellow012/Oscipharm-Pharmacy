"use client";

import type { Dispatch, SetStateAction } from "react";
import { NEW_CATALOG_ITEM } from "@/features/catalog/lib/variant-validation";
import type { StaffCatalogCategory } from "@/features/catalog/types";
import { FormField, FormInput, FormSelect } from "@/features/shared/components/FormField";

type EditableVariant = {
  brandName: string;
  strength: string | null;
  packSize: number;
  unitLabel: string;
  allowsLooseSale: boolean;
  isActive: boolean;
  pricePerPack: string | null;
  pricePerUnit: string | null;
};

export function StaffVariantFields({
  categories,
  variant,
  categoryMode,
  setCategoryMode,
  categoryId,
  setCategoryId,
  categoryName,
  setCategoryName,
  ingredientMode,
  setIngredientMode,
  ingredientId,
  setIngredientId,
  ingredientName,
  setIngredientName,
  allowsLooseSale,
  setAllowsLooseSale,
  errorFor,
}: {
  categories: StaffCatalogCategory[];
  variant: EditableVariant | null;
  categoryMode: string;
  setCategoryMode: Dispatch<SetStateAction<string>>;
  categoryId: string;
  setCategoryId: Dispatch<SetStateAction<string>>;
  categoryName: string;
  setCategoryName: Dispatch<SetStateAction<string>>;
  ingredientMode: string;
  setIngredientMode: Dispatch<SetStateAction<string>>;
  ingredientId: string;
  setIngredientId: Dispatch<SetStateAction<string>>;
  ingredientName: string;
  setIngredientName: Dispatch<SetStateAction<string>>;
  allowsLooseSale: boolean;
  setAllowsLooseSale: Dispatch<SetStateAction<boolean>>;
  errorFor: (field: string) => string | undefined;
}) {
  const ingredients = categories.find((category) => category.id === categoryId)?.ingredients ?? [];

  return (
    <>
      <FormField id="variant-category" label="Category" error={errorFor("categoryId")}>
        {(fieldProps) => (
          <FormSelect
            {...fieldProps}
            value={
              categoryMode === "new"
                ? NEW_CATALOG_ITEM
                : categoryMode === "none"
                  ? "none"
                  : categoryId
            }
            disabled={Boolean(variant)}
            onChange={(event) => {
              const value = event.target.value;
              const nextMode =
                value === NEW_CATALOG_ITEM ? "new" : value === "none" ? "none" : "existing";
              setCategoryMode(nextMode);
              setCategoryId(nextMode === "existing" ? value : "");
              setIngredientMode(nextMode === "none" ? "none" : "new");
              setIngredientId("");
            }}
          >
            <option value="none">Uncategorized</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            {!variant ? <option value={NEW_CATALOG_ITEM}>+ Create category</option> : null}
          </FormSelect>
        )}
      </FormField>
      {!variant && categoryMode === "new" ? (
        <FormField
          id="variant-category-name"
          label="New category name"
          error={errorFor("categoryName")}
          required
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="categoryName"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              maxLength={100}
              placeholder="New category name"
            />
          )}
        </FormField>
      ) : null}

      <FormField id="variant-ingredient" label="Ingredient" error={errorFor("ingredientId")}>
        {(fieldProps) => (
          <FormSelect
            {...fieldProps}
            value={
              ingredientMode === "new"
                ? NEW_CATALOG_ITEM
                : ingredientMode === "none"
                  ? "none"
                  : ingredientId
            }
            disabled={Boolean(variant) || categoryMode === "new"}
            onChange={(event) => {
              const value = event.target.value;
              const nextMode =
                value === NEW_CATALOG_ITEM ? "new" : value === "none" ? "none" : "existing";
              setIngredientMode(nextMode);
              setIngredientId(nextMode === "existing" ? value : "");
            }}
          >
            <option value="none">No ingredient</option>
            {ingredients.map((ingredient) => (
              <option key={ingredient.id} value={ingredient.id}>
                {ingredient.name}
              </option>
            ))}
            {!variant && categoryMode !== "new" ? (
              <option value={NEW_CATALOG_ITEM}>+ Create ingredient</option>
            ) : null}
          </FormSelect>
        )}
      </FormField>
      {!variant && ingredientMode === "new" ? (
        <FormField
          id="variant-ingredient-name"
          label="New ingredient name"
          error={errorFor("ingredientName")}
          required
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="ingredientName"
              value={ingredientName}
              onChange={(event) => setIngredientName(event.target.value)}
              maxLength={100}
              placeholder="New ingredient name"
            />
          )}
        </FormField>
      ) : null}

      <div className="grid min-w-0 gap-space-md sm:grid-cols-2">
        <FormField id="variant-brand" label="Brand name" error={errorFor("brandName")} required>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="brandName"
              maxLength={100}
              defaultValue={variant?.brandName ?? ""}
            />
          )}
        </FormField>
        <FormField id="variant-strength" label="Strength (optional)" error={errorFor("strength")}>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="strength"
              maxLength={100}
              defaultValue={variant?.strength ?? ""}
            />
          )}
        </FormField>
        <FormField id="variant-pack-size" label="Pack size" error={errorFor("packSize")} required>
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="packSize"
              type="number"
              min="1"
              step="1"
              defaultValue={variant?.packSize ?? ""}
            />
          )}
        </FormField>
        <FormField
          id="variant-unit-label"
          label="Unit label"
          error={errorFor("unitLabel")}
          required
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="unitLabel"
              maxLength={30}
              defaultValue={variant?.unitLabel ?? "unit"}
            />
          )}
        </FormField>
        <FormField
          id="variant-pack-price"
          label="Pack price"
          error={errorFor("pricePerPack")}
          required
        >
          {(fieldProps) => (
            <FormInput
              {...fieldProps}
              name="pricePerPack"
              type="number"
              min="0"
              step="0.01"
              defaultValue={variant?.pricePerPack ?? ""}
            />
          )}
        </FormField>
        {allowsLooseSale ? (
          <FormField
            id="variant-unit-price"
            label="Unit price"
            error={errorFor("pricePerUnit")}
            required
          >
            {(fieldProps) => (
              <FormInput
                {...fieldProps}
                name="pricePerUnit"
                type="number"
                min="0"
                step="0.01"
                defaultValue={variant?.pricePerUnit ?? ""}
              />
            )}
          </FormField>
        ) : (
          <input type="hidden" name="pricePerUnit" value="" />
        )}
      </div>

      <div className="space-y-space-sm border-y border-outline-variant py-space-md">
        <label className="flex min-h-11 items-center gap-space-sm font-body-sm text-body-sm text-on-surface">
          <input
            name="allowsLooseSale"
            type="checkbox"
            checked={allowsLooseSale}
            onChange={(event) => setAllowsLooseSale(event.target.checked)}
            className="size-4 accent-primary"
          />
          Allow loose-unit sales
        </label>
        {errorFor("allowsLooseSale") ? (
          <p className="font-body-sm text-body-sm text-status-danger-text">
            {errorFor("allowsLooseSale")}
          </p>
        ) : null}
        <label className="flex min-h-11 items-center gap-space-sm font-body-sm text-body-sm text-on-surface">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={variant?.isActive ?? true}
            className="size-4 accent-primary"
          />
          Active in catalog
        </label>
      </div>
    </>
  );
}
