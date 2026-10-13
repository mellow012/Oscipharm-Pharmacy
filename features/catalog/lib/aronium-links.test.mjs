import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { validateAroniumProductLink } from "./aronium-link-validation.ts";

const prisma = new PrismaClient();
const validInput = { aroniumCode: " 003 ", variantId: "variant-1", mode: "PACK" };

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