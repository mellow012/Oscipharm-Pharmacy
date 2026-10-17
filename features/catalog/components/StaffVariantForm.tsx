"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { NEW_CATALOG_ITEM } from "@/features/catalog/lib/variant-validation";
import { variantInputSchema } from "@/features/catalog/lib/variant-validation";
import { saveStaffVariant, type StaffVariantActionState } from "@/features/catalog/lib/variant-actions";
import type { StaffCatalogCategory } from "@/features/catalog/types";

const initialState: StaffVariantActionState = {};

type EditableVariant = {
    id: string;
    categoryId: string | null;
    ingredientId: string | null;
    brandName: string;
    strength: string | null;
    packSize: number;
    unitLabel: string;
    allowsLooseSale: boolean;
    isActive: boolean;
    pricePerPack: string | null;
    pricePerUnit: string | null;
};

export function StaffVariantForm({
    categories,
    branchId,
    variant,
    onCancel,
    onSaved,
}: {
    categories: StaffCatalogCategory[];
    branchId: string;
    variant: EditableVariant | null;
    onCancel: () => void;
    onSaved: (variantId: string) => void;
}) {
    const [state, formAction, pending] = useActionState(saveStaffVariant, initialState);
    const [categoryMode, setCategoryMode] = useState(variant?.categoryId ? "existing" : "none");
    const [categoryId, setCategoryId] = useState(variant?.categoryId ?? "");
    const [categoryName, setCategoryName] = useState("");
    const [ingredientMode, setIngredientMode] = useState(variant?.ingredientId ? "existing" : "none");
    const [ingredientId, setIngredientId] = useState(variant?.ingredientId ?? "");
    const [ingredientName, setIngredientName] = useState("");
    const [allowsLooseSale, setAllowsLooseSale] = useState(variant?.allowsLooseSale ?? false);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const handledSaveId = useRef<string | null>(null);
    const ingredients = categories.find((category) => category.id === categoryId)?.ingredients ?? [];

    useEffect(() => {
        if (state.variantId && handledSaveId.current !== state.variantId) {
            handledSaveId.current = state.variantId;
            onSaved(state.variantId);
        }
    }, [onSaved, state.variantId]);

    const validateBeforeSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        const data = new FormData(event.currentTarget);
        const parsed = variantInputSchema.safeParse(Object.fromEntries(data.entries()));
        if (parsed.success) {
            setClientErrors({});
            return;
        }
        event.preventDefault();
        const nextErrors: Record<string, string> = {};
        parsed.error.issues.forEach((issue) => {
            const key = String(issue.path[0] ?? "form");
            if (!nextErrors[key]) nextErrors[key] = issue.message;
        });
        setClientErrors(nextErrors);
    };

    const errorFor = (field: string) => clientErrors[field] ?? state.errors?.[field as keyof NonNullable<StaffVariantActionState["errors"]>];
    const fieldClass = "mt-1 w-full border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

    return (
        <form action={formAction} onSubmit={validateBeforeSubmit} className="space-y-4">
            <input type="hidden" name="branchId" value={branchId} />
            <input type="hidden" name="variantId" value={variant?.id ?? ""} />
            <input type="hidden" name="categoryMode" value={categoryMode} />
            <input type="hidden" name="categoryId" value={categoryMode === "existing" ? categoryId : ""} />
            <input type="hidden" name="ingredientMode" value={ingredientMode} />
            <input type="hidden" name="ingredientId" value={ingredientMode === "existing" ? ingredientId : ""} />

            <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted" htmlFor="variant-category">Category</label>
                <select
                    id="variant-category"
                    value={categoryMode === "new" ? NEW_CATALOG_ITEM : categoryMode === "none" ? "none" : categoryId}
                    disabled={Boolean(variant)}
                    onChange={(event) => {
                        const value = event.target.value;
                        const nextMode = value === NEW_CATALOG_ITEM ? "new" : value === "none" ? "none" : "existing";
                        setCategoryMode(nextMode);
                        setCategoryId(nextMode === "existing" ? value : "");
                        setIngredientMode(nextMode === "none" ? "none" : "new");
                        setIngredientId("");
                    }}
                    className={fieldClass}
                >
                    <option value="none">Uncategorized</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    {!variant ? <option value={NEW_CATALOG_ITEM}>+ Create category</option> : null}
                </select>
                <input
                    name="categoryName"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required={!variant && categoryMode === "new"}
                    disabled={Boolean(variant) || categoryMode !== "new"}
                    maxLength={100}
                    placeholder="New category name"
                    className={`${fieldClass} ${!variant && categoryMode === "new" ? "" : "hidden"}`}
                />
                {errorFor("categoryId") || errorFor("categoryName") ? <p className="mt-1 text-xs text-danger">{errorFor("categoryId") ?? errorFor("categoryName")}</p> : null}
            </div>

            <div>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted" htmlFor="variant-ingredient">Ingredient</label>
                <select
                    id="variant-ingredient"
                    value={ingredientMode === "new" ? NEW_CATALOG_ITEM : ingredientMode === "none" ? "none" : ingredientId}
                    disabled={Boolean(variant) || categoryMode === "new"}
                    onChange={(event) => {
                        const value = event.target.value;
                        const nextMode = value === NEW_CATALOG_ITEM ? "new" : value === "none" ? "none" : "existing";
                        setIngredientMode(nextMode);
                        setIngredientId(nextMode === "existing" ? value : "");
                    }}
                    className={fieldClass}
                >
                    <option value="none">No ingredient</option>
                    {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
                    {!variant && categoryMode !== "new" ? <option value={NEW_CATALOG_ITEM}>+ Create ingredient</option> : null}
                </select>
                <input
                    name="ingredientName"
                    value={ingredientName}
                    onChange={(event) => setIngredientName(event.target.value)}
                    required={!variant && ingredientMode === "new"}
                    disabled={Boolean(variant) || ingredientMode !== "new"}
                    maxLength={100}
                    placeholder="New ingredient name"
                    className={`${fieldClass} ${!variant && ingredientMode === "new" ? "" : "hidden"}`}
                />
                {errorFor("ingredientId") || errorFor("ingredientName") ? <p className="mt-1 text-xs text-danger">{errorFor("ingredientId") ?? errorFor("ingredientName")}</p> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    Brand name
                    <input name="brandName" required maxLength={100} defaultValue={variant?.brandName ?? ""} className={fieldClass} />
                    {errorFor("brandName") ? <span className="mt-1 block text-xs text-danger">{errorFor("brandName")}</span> : null}
                </label>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    Strength <span className="normal-case tracking-normal">(optional)</span>
                    <input name="strength" maxLength={100} defaultValue={variant?.strength ?? ""} className={fieldClass} />
                    {errorFor("strength") ? <span className="mt-1 block text-xs text-danger">{errorFor("strength")}</span> : null}
                </label>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    Pack size
                    <input name="packSize" type="number" min="1" step="1" required defaultValue={variant?.packSize ?? ""} className={fieldClass} />
                    {errorFor("packSize") ? <span className="mt-1 block text-xs text-danger">{errorFor("packSize")}</span> : null}
                </label>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    Unit label
                    <input name="unitLabel" required maxLength={30} defaultValue={variant?.unitLabel ?? "unit"} className={fieldClass} />
                    {errorFor("unitLabel") ? <span className="mt-1 block text-xs text-danger">{errorFor("unitLabel")}</span> : null}
                </label>
                <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                    Pack price
                    <input name="pricePerPack" type="number" min="0" step="0.01" required defaultValue={variant?.pricePerPack ?? ""} className={fieldClass} />
                    {errorFor("pricePerPack") ? <span className="mt-1 block text-xs text-danger">{errorFor("pricePerPack")}</span> : null}
                </label>
                {allowsLooseSale ? (
                    <label className="block text-xs font-medium uppercase tracking-[0.08em] text-muted">
                        Unit price
                        <input name="pricePerUnit" type="number" min="0" step="0.01" required defaultValue={variant?.pricePerUnit ?? ""} className={fieldClass} />
                        {errorFor("pricePerUnit") ? <span className="mt-1 block text-xs text-danger">{errorFor("pricePerUnit")}</span> : null}
                    </label>
                ) : <input type="hidden" name="pricePerUnit" value="" />}
            </div>

            <div className="space-y-3 border-y border-border py-3">
                <label className="flex items-center gap-3 text-sm text-ink">
                    <input name="allowsLooseSale" type="checkbox" checked={allowsLooseSale} onChange={(event) => setAllowsLooseSale(event.target.checked)} className="size-4 accent-primary" />
                    Allow loose-unit sales
                </label>
                {errorFor("allowsLooseSale") ? <p className="text-xs text-danger">{errorFor("allowsLooseSale")}</p> : null}
                <label className="flex items-center gap-3 text-sm text-ink">
                    <input name="isActive" type="checkbox" defaultChecked={variant?.isActive ?? true} className="size-4 accent-primary" />
                    Active in catalog
                </label>
            </div>

            {errorFor("form") ? <p role="alert" className="text-sm text-danger">{errorFor("form")}</p> : null}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="border border-border px-4 py-2 text-sm text-ink">Cancel</button>
                <button type="submit" disabled={pending} className="border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-60">
                    {pending ? "Saving..." : variant ? "Save changes" : "Add variant"}
                </button>
            </div>
        </form>
    );
}