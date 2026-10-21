import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { seedCanonicalBranch } from "./seed.ts";
import { requireTestDatabaseUrl } from "../scripts/test-database-safety.mjs";

process.env.SEED_ADMIN_PASSWORD = "FAKE_TEST_ADMIN_PASSWORD_0001";
process.env.SEED_MANAGER_PASSWORD = "FAKE_TEST_MANAGER_PASSWORD_0001";
process.env.SEED_POS_PASSWORD = "FAKE_TEST_POS_PASSWORD_0001";

const testDatabaseUrl = requireTestDatabaseUrl();

test("seed leaves exactly one canonical branch and no placeholder test users", async () => {
    const prisma = new PrismaClient({ datasources: { db: { url: testDatabaseUrl } } });

    try {
        await prisma.saleItem.deleteMany({});
        await prisma.sale.deleteMany({});
        await prisma.auditLog.deleteMany({});
        await prisma.aroniumProductLink.deleteMany({});
        await prisma.newsImage.deleteMany({});
        await prisma.news.deleteMany({});
        await prisma.batch.deleteMany({});
        await prisma.branchPrice.deleteMany({});
        await prisma.importRun.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.branch.deleteMany({});
        await seedCanonicalBranch(prisma);

        const [branchCount, branches, users, categories, ingredients, variants] = await Promise.all([
            prisma.branch.count(),
            prisma.branch.findMany({ select: { name: true, location: true } }),
            prisma.user.findMany({ select: { email: true } }),
            prisma.category.count(),
            prisma.ingredient.count(),
            prisma.variant.findMany({
                select: { ingredientId: true, packSize: true, unitLabel: true, allowsLooseSale: true, aroniumProductLinks: { select: { aroniumCode: true, mode: true } } },
            }),
        ]);

        assert.equal(branchCount, 1, "seed should leave exactly one branch");
        assert.deepEqual(branches.map((branch) => branch.name), ["Blantyre Town Lunzu"]);
        assert.equal(branches[0].location, "Blantyre, Malawi");
        assert.equal(users.length, 3, "seed should create the canonical dev users");
        assert.ok(users.every((user) => user.email.endsWith("@local.dev")), "dev emails should use a local-dev domain");
        assert.equal(await prisma.user.count({ where: { email: { endsWith: "@pharmacy.test" } } }), 0);
        assert.equal(categories, 0, "seed should not create categories");
        assert.equal(ingredients, 0, "seed should not create ingredients");
        assert.equal(variants.length, 3);
        assert.ok(variants.every((variant) => variant.ingredientId === null && variant.packSize === 1 && !variant.allowsLooseSale));
        assert.deepEqual(variants.flatMap((variant) => variant.aroniumProductLinks.map((link) => link.aroniumCode)).sort(), ["DEV-001", "DEV-002", "DEV-005"]);
        assert.ok(variants.every((variant) => variant.aroniumProductLinks.length === 1 && variant.aroniumProductLinks[0].mode === "PACK"));
    } finally {
        await prisma.$disconnect();
    }
});
