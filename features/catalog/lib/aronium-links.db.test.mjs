import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../../../scripts/test-database-safety.mjs";

const testDatabaseUrl = requireTestDatabaseUrl();
process.env.DATABASE_URL = testDatabaseUrl;
const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

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
    const user = await prisma.user.upsert({
        where: { email: "admin@local.dev" },
        create: { name: "Admin User", email: "admin@local.dev", passwordHash: "dev-only", role: "ADMIN", branchId: null },
        update: {},
    });

    try {
        await prisma.aroniumProductLink.create({
            data: { aroniumCode: `code-${uniqueSuffix}`, variantId: variant.id, mode: "PACK", createdById: user.id },
        });

        await assert.rejects(
            () => prisma.aroniumProductLink.create({
                data: { aroniumCode: `code-${uniqueSuffix}`, variantId: variant.id, mode: "UNIT", createdById: user.id },
            }),
            (error) => error?.code === "P2002",
        );
        await assert.rejects(
            () => prisma.aroniumProductLink.create({
                data: { aroniumCode: `code-${uniqueSuffix}-2`, variantId: variant.id, mode: "PACK", createdById: user.id },
            }),
            (error) => error?.code === "P2002",
        );
    } finally {
        await prisma.auditLog.deleteMany({ where: { userId: user.id } });
        await prisma.aroniumProductLink.deleteMany({ where: { createdById: user.id } });
        await prisma.aroniumProductLink.deleteMany({ where: { variantId: variant.id } });
        await prisma.variant.delete({ where: { id: variant.id } });
        await prisma.ingredient.delete({ where: { id: ingredient.id } });
        await prisma.category.delete({ where: { id: category.id } });
        await prisma.$disconnect();
    }
});