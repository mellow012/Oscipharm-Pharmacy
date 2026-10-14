"use server";

import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAuthorizedBranchId, type StaffSession } from "@/features/catalog/lib/aronium-actions";
import { firstVariantInputError, hasDuplicateVariant, looseSaleUnitLinkError, newCatalogNameErrors, variantInputSchema, type VariantFieldErrors, type VariantInput } from "@/features/catalog/lib/variant-validation";

export type StaffVariantActionState = {
    errors?: VariantFieldErrors;
    success?: string;
    variantId?: string;
};

function getText(formData: FormData, field: string) {
    return String(formData.get(field) ?? "");
}

function getVariantInput(formData: FormData) {
    return {
        variantId: getText(formData, "variantId"),
        categoryMode: getText(formData, "categoryMode"),
        categoryId: getText(formData, "categoryId"),
        categoryName: getText(formData, "categoryName"),
        ingredientMode: getText(formData, "ingredientMode"),
        ingredientId: getText(formData, "ingredientId"),
        ingredientName: getText(formData, "ingredientName"),
        brandName: getText(formData, "brandName"),
        strength: getText(formData, "strength"),
        packSize: getText(formData, "packSize"),
        unitLabel: getText(formData, "unitLabel"),
        allowsLooseSale: getText(formData, "allowsLooseSale") || undefined,
        isActive: getText(formData, "isActive") || undefined,
        pricePerPack: getText(formData, "pricePerPack"),
        pricePerUnit: getText(formData, "pricePerUnit"),
    };
}

function expectedDatabaseError(error: unknown): StaffVariantActionState | null {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
    if (error.code === "P2002") {
        const target = Array.isArray(error.meta?.target) ? error.meta.target.join(" ").toLowerCase() : String(error.meta?.target ?? "").toLowerCase();
        if (target.includes("categoryid")) return { errors: { ingredientName: "An ingredient with this name already exists in this category." } };
        if (target.includes("category") || (target.includes("name") && !target.includes("brandname"))) {
            return { errors: { categoryName: "A category with this name already exists." } };
        }
        return { errors: { brandName: "A variant with that brand and strength already exists for this ingredient." } };
    }
    if (error.code === "P2003" || error.code === "P2025") {
        return { errors: { form: "A selected catalog item or branch is no longer available. Refresh and try again." } };
    }
    return null;
}

async function isDuplicateVariant(input: VariantInput) {
    const variants = await prisma.variant.findMany({
        where: { ingredientId: input.ingredientId },
        select: { id: true, ingredientId: true, brandName: true, strength: true },
    });
    return hasDuplicateVariant({
        id: input.variantId || undefined,
        ingredientId: input.ingredientId,
        brandName: input.brandName,
        strength: input.strength,
    }, variants);
}

export async function saveStaffVariant(
    _previousState: StaffVariantActionState,
    formData: FormData,
): Promise<StaffVariantActionState> {
    const session = await getServerSession(authOptions);
    if (!session?.user || !can(session.user.role, "catalog:manage")) {
        return { errors: { form: "You are not allowed to manage the catalog." } };
    }

    const branchId = await getAuthorizedBranchId(formData, session as StaffSession);
    if (!branchId) return { errors: { form: "Choose a valid branch for this catalog change." } };

    const parsed = variantInputSchema.safeParse(getVariantInput(formData));
    if (!parsed.success) return { errors: firstVariantInputError(parsed.error) };
    const input = parsed.data;

    const category = input.categoryMode === "existing"
        ? await prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } })
        : null;
    if (input.categoryMode === "existing" && !category) return { errors: { categoryId: "Choose a valid category." } };
    const ingredient = input.ingredientMode === "existing"
        ? await prisma.ingredient.findFirst({
            where: { id: input.ingredientId, categoryId: category?.id },
            select: { id: true },
        })
        : null;
    if (input.ingredientMode === "existing" && !ingredient) {
        return { errors: { ingredientId: "Choose an ingredient in the selected category." } };
    }
    const [categoryNames, ingredientNames] = await Promise.all([
        input.categoryMode === "new"
            ? prisma.category.findMany({ select: { name: true } }).then((rows) => rows.map((row) => row.name))
            : Promise.resolve([] as string[]),
        input.categoryMode === "existing" && input.ingredientMode === "new" && category
            ? prisma.ingredient.findMany({ where: { categoryId: category.id }, select: { name: true } }).then((rows) => rows.map((row) => row.name))
            : Promise.resolve([] as string[]),
    ]);
    const nameErrors = newCatalogNameErrors(input, { categoryNames, ingredientNames });
    if (Object.keys(nameErrors).length > 0) return { errors: nameErrors };

    const currentVariant = input.variantId
        ? await prisma.variant.findUnique({ where: { id: input.variantId }, include: { ingredient: { select: { categoryId: true } } } })
        : null;
    if (input.variantId && !currentVariant) return { errors: { form: "This variant no longer exists. Refresh and try again." } };
    if (currentVariant && input.ingredientMode === "existing" && currentVariant.ingredientId !== ingredient?.id) {
        return { errors: { form: "The ingredient cannot be changed when editing a variant." } };
    }
    if (currentVariant && category && currentVariant.ingredient.categoryId !== category.id) {
        return { errors: { form: "The category cannot be changed when editing a variant." } };
    }

    const resolvedIngredientId = ingredient?.id ?? currentVariant?.ingredientId ?? "";
    const variantCandidate = { ...input, ingredientId: resolvedIngredientId };
    if (resolvedIngredientId && await isDuplicateVariant(variantCandidate)) {
        return { errors: { brandName: "A variant with that brand and strength already exists for this ingredient." } };
    }

    const hasUnitLink = currentVariant
        ? Boolean(await prisma.aroniumProductLink.findFirst({ where: { variantId: currentVariant.id, mode: "UNIT" }, select: { id: true } }))
        : false;
    const looseSaleError = looseSaleUnitLinkError(Boolean(currentVariant?.allowsLooseSale), input.allowsLooseSale, hasUnitLink);
    if (looseSaleError) return { errors: { allowsLooseSale: looseSaleError } };

    try {
        const saved = await prisma.$transaction(async (tx) => {
            const resolvedCategoryId = category?.id ?? (await tx.category.create({ data: { name: input.categoryName } })).id;
            const savedIngredientId = ingredient?.id ?? (currentVariant?.ingredientId ?? (await tx.ingredient.create({
                data: { name: input.ingredientName, categoryId: resolvedCategoryId },
            })).id);
            const oldPrice = currentVariant
                ? await tx.branchPrice.findUnique({ where: { variantId_branchId: { variantId: currentVariant.id, branchId } } })
                : null;
            const variantData = {
                ingredientId: savedIngredientId,
                brandName: input.brandName,
                strength: input.strength,
                packSize: input.packSize,
                unitLabel: input.unitLabel,
                allowsLooseSale: input.allowsLooseSale,
                isActive: input.isActive,
            };
            const variant = currentVariant
                ? await tx.variant.update({ where: { id: currentVariant.id }, data: variantData })
                : await tx.variant.create({ data: variantData });
            const pricePerUnit = input.allowsLooseSale ? input.pricePerUnit : 0;
            await tx.branchPrice.upsert({
                where: { variantId_branchId: { variantId: variant.id, branchId } },
                create: { variantId: variant.id, branchId, pricePerPack: input.pricePerPack, pricePerUnit, updatedById: session.user.id },
                update: { pricePerPack: input.pricePerPack, pricePerUnit, updatedById: session.user.id },
            });
            await tx.auditLog.create({
                data: {
                    action: "PRICE_CHANGED",
                    branchId,
                    userId: session.user.id,
                    details: {
                        event: currentVariant ? "CATALOG_VARIANT_UPDATED" : "CATALOG_VARIANT_CREATED",
                        variantId: variant.id,
                        oldValues: currentVariant ? {
                            categoryId: currentVariant.ingredient.categoryId,
                            ingredientId: currentVariant.ingredientId,
                            brandName: currentVariant.brandName,
                            strength: currentVariant.strength,
                            packSize: currentVariant.packSize,
                            unitLabel: currentVariant.unitLabel,
                            allowsLooseSale: currentVariant.allowsLooseSale,
                            isActive: currentVariant.isActive,
                            pricePerPack: oldPrice?.pricePerPack.toString() ?? null,
                            pricePerUnit: oldPrice?.pricePerUnit.toString() ?? null,
                        } : null,
                        newValues: {
                            categoryId: resolvedCategoryId,
                            ...variantData,
                            pricePerPack: input.pricePerPack,
                            pricePerUnit,
                        },
                    },
                },
            });
            return variant.id;
        });

        revalidatePath("/staff/catalog");
        revalidatePath("/catalog");
        revalidatePath("/catalog/[categoryId]", "page");
        revalidatePath("/catalog/[categoryId]/[ingredientId]", "page");
        return { success: "Variant saved.", variantId: saved };
    } catch (error) {
        const actionError = expectedDatabaseError(error);
        if (actionError) return actionError;
        throw error;
    }
}