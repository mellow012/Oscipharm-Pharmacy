import { z } from "zod";

export const NEW_CATALOG_ITEM = "__new__";

const moneyInput = z.string().trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount.")
    .transform(Number)
    .refine((value) => value <= 99_999_999.99, "Amount is too large.");

export const variantInputSchema = z.object({
    variantId: z.string().trim().optional(),
    categoryMode: z.enum(["none", "existing", "new"]),
    categoryId: z.string().trim(),
    categoryName: z.string().trim().max(100, "Category name must be 100 characters or fewer.").optional().default(""),
    ingredientMode: z.enum(["none", "existing", "new"]),
    ingredientId: z.string().trim(),
    ingredientName: z.string().trim().max(100, "Ingredient name must be 100 characters or fewer.").optional().default(""),
    brandName: z.string().trim().min(1, "Enter a brand name.").max(100, "Brand name must be 100 characters or fewer."),
    strength: z.string().trim().max(100, "Strength must be 100 characters or fewer."),
    packSize: z.string().trim()
        .regex(/^[1-9]\d*$/, "Pack size must be a positive whole number.")
        .transform(Number)
        .refine(Number.isSafeInteger, "Pack size is too large."),
    unitLabel: z.string().trim().min(1, "Enter a unit label.").max(30, "Unit label must be 30 characters or fewer."),
    allowsLooseSale: z.string().optional().transform((value) => value === "on"),
    isActive: z.string().optional().transform((value) => value === "on"),
    pricePerPack: moneyInput,
    pricePerUnit: z.string().trim().optional().default(""),
}).superRefine((input, context) => {
    if (input.categoryMode === "existing" && !input.categoryId) {
        context.addIssue({ code: "custom", path: ["categoryId"], message: "Choose a category." });
    }
    if (input.categoryMode === "new" && !input.categoryName) {
        context.addIssue({ code: "custom", path: ["categoryName"], message: "Enter a category name." });
    }
    if (input.ingredientMode === "existing" && !input.ingredientId) {
        context.addIssue({ code: "custom", path: ["ingredientId"], message: "Choose an ingredient." });
    }
    if (input.ingredientMode === "new" && !input.ingredientName) {
        context.addIssue({ code: "custom", path: ["ingredientName"], message: "Enter an ingredient name." });
    }
    if (input.categoryMode === "new" && input.ingredientMode !== "new") {
        context.addIssue({ code: "custom", path: ["ingredientId"], message: "Choose or create an ingredient for the new category." });
    }
    if (input.allowsLooseSale && !/^\d+(\.\d{1,2})?$/.test(input.pricePerUnit ?? "")) {
        context.addIssue({ code: "custom", path: ["pricePerUnit"], message: "Enter a valid unit price." });
    } else if (input.allowsLooseSale && Number(input.pricePerUnit) > 99_999_999.99) {
        context.addIssue({ code: "custom", path: ["pricePerUnit"], message: "Amount is too large." });
    }
}).transform((input) => ({
    ...input,
    strength: input.strength || null,
    pricePerUnit: input.allowsLooseSale ? Number(input.pricePerUnit) : 0,
}));

export type VariantInput = z.output<typeof variantInputSchema>;
export type VariantField = "categoryId" | "categoryName" | "ingredientId" | "ingredientName" | "brandName" | "strength" | "packSize" | "unitLabel" | "pricePerPack" | "pricePerUnit" | "allowsLooseSale" | "form";
export type VariantFieldErrors = Partial<Record<VariantField, string>>;

export function firstVariantInputError(error: z.ZodError): VariantFieldErrors {
    const errors: VariantFieldErrors = {};
    for (const issue of error.issues) {
        const field = String(issue.path[0] ?? "form") as VariantField;
        if (!errors[field]) errors[field] = issue.message;
    }
    return errors;
}

export function hasDuplicateVariant(
    candidate: { id?: string; ingredientId: string | null; brandName: string; strength: string | null },
    variants: Array<{ id: string; ingredientId: string | null; brandName: string; strength: string | null }>,
) {
    const brandName = candidate.brandName.trim().toLocaleLowerCase();
    const strength = candidate.strength?.trim().toLocaleLowerCase() || null;
    return variants.some((variant) => {
        if (variant.id === candidate.id || variant.ingredientId !== candidate.ingredientId) return false;
        return variant.brandName.trim().toLocaleLowerCase() === brandName
            && (variant.strength?.trim().toLocaleLowerCase() || null) === strength;
    });
}

export function looseSaleUnitLinkError(wasAllowed: boolean, willAllow: boolean, hasUnitLink: boolean) {
    return wasAllowed && !willAllow && hasUnitLink
        ? "Remove the UNIT Aronium link before disabling loose sales."
        : null;
}

export function hasDuplicateName(candidate: string, names: string[]) {
    const normalized = candidate.trim().toLocaleLowerCase();
    return names.some((name) => name.trim().toLocaleLowerCase() === normalized);
}

export function newCatalogNameErrors(
    input: Pick<VariantInput, "categoryMode" | "categoryName" | "ingredientMode" | "ingredientName">,
    existing: { categoryNames?: string[]; ingredientNames?: string[] },
): VariantFieldErrors {
    const errors: VariantFieldErrors = {};
    if (input.categoryMode === "new" && hasDuplicateName(input.categoryName, existing.categoryNames ?? [])) {
        errors.categoryName = "A category with this name already exists.";
    }
    if (input.categoryMode === "existing" && input.ingredientMode === "new"
        && hasDuplicateName(input.ingredientName, existing.ingredientNames ?? [])) {
        errors.ingredientName = "An ingredient with this name already exists in this category.";
    }
    return errors;
}