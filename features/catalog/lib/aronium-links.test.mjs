import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { validateAroniumProductLink } from "./aronium-link-validation.ts";
import { hasDuplicateName, hasDuplicateVariant, looseSaleUnitLinkError, newCatalogNameErrors, variantInputSchema } from "./variant-validation.ts";

const prisma = new PrismaClient();
const validInput = { aroniumCode: " 003 ", variantId: "variant-1", mode: "PACK" };

test("variant schema trims names and validates pack size and prices", () => {
    const parsed = variantInputSchema.safeParse({
        categoryMode: "new", categoryId: "", categoryName: " Pain Relief ",
        ingredientMode: "new", ingredientId: "", ingredientName: " Paracetamol ",
        brandName: " Panadol ", strength: " ", packSize: "20", unitLabel: " tablet ",
        allowsLooseSale: undefined, isActive: "on", pricePerPack: "12.50", pricePerUnit: "",
    });
    assert.equal(parsed.success, true);
    assert.equal(parsed.data.brandName, "Panadol");
    assert.equal(parsed.data.strength, null);
    assert.equal(parsed.data.pricePerUnit, 0);
    assert.equal(variantInputSchema.safeParse({
        categoryMode: "existing", categoryId: "c1", categoryName: "", ingredientMode: "existing", ingredientId: "i1", ingredientName: "",
        brandName: "Brand", strength: "", packSize: "0", unitLabel: "unit", allowsLooseSale: undefined, isActive: "on", pricePerPack: "-1",
    }).success, false);
});

test("unit price is required only when loose sales are enabled", () => {
    const input = {
        categoryMode: "existing", categoryId: "c1", categoryName: "", ingredientMode: "existing", ingredientId: "i1", ingredientName: "",
        brandName: "Brand", strength: "", packSize: "1", unitLabel: "unit", isActive: "on", pricePerPack: "0",
    };
    assert.equal(variantInputSchema.safeParse({ ...input, allowsLooseSale: "on", pricePerUnit: "" }).success, false);
    assert.equal(variantInputSchema.safeParse({ ...input, allowsLooseSale: undefined, pricePerUnit: "" }).success, true);
});

test("existing and edit modes accept omitted category and ingredient names", () => {
    const base = {
        categoryMode: "existing", categoryId: "c1", ingredientMode: "existing", ingredientId: "i1",
        brandName: "Brand", strength: "", packSize: "1", unitLabel: "unit", isActive: "on", pricePerPack: "0",
    };
    assert.equal(variantInputSchema.safeParse(base).success, true);
    assert.equal(variantInputSchema.safeParse({ ...base, variantId: "variant-1" }).success, true);
    assert.equal(variantInputSchema.safeParse({ ...base, categoryName: "", ingredientName: "" }).success, true);
});

test("new category and ingredient modes require non-empty names", () => {
    const base = {
        categoryId: "", ingredientId: "", brandName: "Brand", strength: "", packSize: "1",
        unitLabel: "unit", isActive: "on", pricePerPack: "0",
    };
    const result = variantInputSchema.safeParse({
        ...base, categoryMode: "new", categoryName: " ", ingredientMode: "new", ingredientName: "",
    });
    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues.map((issue) => issue.path[0]), ["categoryName", "ingredientName"]);
});

test("case-insensitive category and ingredient duplicates are rejected only in new modes", () => {
    const duplicateCategory = newCatalogNameErrors({
        categoryMode: "new", categoryName: " pain relief ", ingredientMode: "new", ingredientName: "Paracetamol",
    }, { categoryNames: ["Pain Relief"] });
    assert.equal(duplicateCategory.categoryName, "A category with this name already exists.");

    const duplicateIngredient = newCatalogNameErrors({
        categoryMode: "existing", categoryName: "", ingredientMode: "new", ingredientName: " paracetamol ",
    }, { ingredientNames: ["Paracetamol"] });
    assert.equal(duplicateIngredient.ingredientName, "An ingredient with this name already exists in this category.");

    assert.deepEqual(newCatalogNameErrors({
        categoryMode: "existing", categoryName: "Pain Relief", ingredientMode: "existing", ingredientName: "Paracetamol",
    }, { categoryNames: ["Pain Relief"], ingredientNames: ["Paracetamol"] }), {});
});

test("duplicate variants are detected when both strengths are null", () => {
    const variants = [{ id: "v1", ingredientId: "i1", brandName: "Panadol", strength: null }];
    assert.equal(hasDuplicateVariant({ ingredientId: "i1", brandName: " panadol ", strength: "" }, variants), true);
    assert.equal(hasDuplicateVariant({ id: "v1", ingredientId: "i1", brandName: "Panadol", strength: null }, variants), false);
});

test("loose sales cannot be disabled while a UNIT link exists", () => {
    assert.equal(looseSaleUnitLinkError(true, false, true), "Remove the UNIT Aronium link before disabling loose sales.");
    assert.equal(looseSaleUnitLinkError(true, false, false), null);
    assert.equal(looseSaleUnitLinkError(false, false, true), null);
});

test("trims and accepts a text Aronium code", () => {
    assert.deepEqual(validateAroniumProductLink(validInput, true), {
        data: { aroniumCode: "003", variantId: "variant-1", mode: "PACK" },
    });
});

test("requires a non-empty Aronium code", () => {
    assert.equal(validateAroniumProductLink({ ...validInput, aroniumCode: "  " }, true).error, "Enter an Aronium product code.");
});

test("rejects UNIT mode when loose sales are disabled", () => {
    assert.equal(validateAroniumProductLink({ ...validInput, mode: "UNIT" }, false).error, "Unit mode is only available for variants that allow loose sales.");
});

test("rejects an Aronium code already used by another link", () => {
    assert.equal(validateAroniumProductLink(validInput, true, { aroniumCodeExists: true }).error, "That Aronium product code is already linked.");
});

test("rejects a second link for the same variant and mode", () => {
    assert.equal(validateAroniumProductLink(validInput, true, { variantModeExists: true }).error, "This variant already has an Aronium link for PACK mode.");
});

test("database rejects duplicate Aronium codes and duplicate variant-mode pairs", async () => {
    const uniqueSuffix = Date.now();
    const category = await prisma.category.create({ data: { name: `Catalog Test ${uniqueSuffix}` } });
    const ingredient = await prisma.ingredient.create({ data: { name: `Ingredient ${uniqueSuffix}`, categoryId: category.id } });
    const variant = await prisma.variant.create({
        data: {
            ingredientId: ingredient.id,
            brandName: `Brand ${uniqueSuffix}`,
            strength: "500mg",
            packSize: 10,
            unitLabel: "tablet",
            allowsLooseSale: true,
        },
    });
    const user = await prisma.user.findFirst({ where: { email: "admin@pharmacy.test" } });
    assert.ok(user, "seeded admin user should exist for link tests");

    await prisma.aroniumProductLink.create({
        data: { aroniumCode: `code-${uniqueSuffix}`, variantId: variant.id, mode: "PACK", createdById: user.id },
    });

    await assert.rejects(
        () => prisma.aroniumProductLink.create({
            data: { aroniumCode: `code-${uniqueSuffix}`, variantId: variant.id, mode: "UNIT", createdById: user.id },
        }),
        (error) => {
            assert.equal(error?.code, "P2002");
            return true;
        },
    );

    await assert.rejects(
        () => prisma.aroniumProductLink.create({
            data: { aroniumCode: `code-${uniqueSuffix}-2`, variantId: variant.id, mode: "PACK", createdById: user.id },
        }),
        (error) => {
            assert.equal(error?.code, "P2002");
            return true;
        },
    );

    await prisma.aroniumProductLink.deleteMany({ where: { variantId: variant.id } });
    await prisma.variant.delete({ where: { id: variant.id } });
    await prisma.ingredient.delete({ where: { id: ingredient.id } });
    await prisma.category.delete({ where: { id: category.id } });
});