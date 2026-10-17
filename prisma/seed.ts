import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { pathToFileURL } from "node:url";

const CANONICAL_BRANCH_NAME = "Blantyre Town Lunzu";
const CANONICAL_BRANCH_LOCATION = "Blantyre, Malawi";
const DEV_ADMIN_EMAIL = "admin@local.dev";
const DEV_BRANCH_MANAGER_EMAIL = "manager.blantyre@local.dev";
const DEV_POS_EMAIL = "pos.blantyre@local.dev";

function isProductionDatabase() {
    const dbUrl = process.env.DATABASE_URL ?? "";
    if (process.env.NODE_ENV === "production") return true;
    const host = dbUrl ? new URL(dbUrl).hostname : "";
    return /(prod|staging|production|live)/i.test(host) || /(prod|staging|production|live)/i.test(dbUrl);
}

export async function seedCanonicalBranch(
    prismaClient = new PrismaClient(),
    options: { allowAuthorizedTarget?: boolean } = {},
) {
    if (!options.allowAuthorizedTarget && isProductionDatabase()) {
        throw new Error("Refusing to run the dev seed against a production-like database.");
    }

    const passwordHash = await bcrypt.hash("password123", 10);

    await prismaClient.auditLog.deleteMany({});
    await prismaClient.saleItem.deleteMany({});
    await prismaClient.sale.deleteMany({});
    await prismaClient.membershipApplication.deleteMany({});
    await prismaClient.newsImage.deleteMany({});
    await prismaClient.news.deleteMany({});
    await prismaClient.batch.deleteMany({});
    await prismaClient.branchPrice.deleteMany({});
    await prismaClient.aroniumProductLink.deleteMany({});
    await prismaClient.variant.deleteMany({});
    await prismaClient.ingredient.deleteMany({});
    await prismaClient.category.deleteMany({});
    await prismaClient.user.deleteMany({});
    await prismaClient.branch.deleteMany({});

    const branch = await prismaClient.branch.create({
            data: { name: CANONICAL_BRANCH_NAME, location: CANONICAL_BRANCH_LOCATION },
        });

    const [adminUser, branchManager] = await Promise.all([
        prismaClient.user.create({
            data: {
                name: "Admin User",
                email: DEV_ADMIN_EMAIL,
                passwordHash,
                role: Role.ADMIN,
                branchId: null,
            },
        }),
        prismaClient.user.create({
            data: {
                name: "Blantyre Manager",
                email: DEV_BRANCH_MANAGER_EMAIL,
                passwordHash,
                role: Role.BRANCH_MANAGER,
                branchId: branch.id,
            },
        }),
        prismaClient.user.create({
            data: {
                name: "Blantyre POS",
                email: DEV_POS_EMAIL,
                passwordHash,
                role: Role.POS,
                branchId: branch.id,
            },
        }),
    ]);

    const oneYearOut = new Date();
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
    const soon = new Date();
    soon.setDate(soon.getDate() + 20);
    const products = [
        { aroniumCode: "DEV-001", name: "Panadol", strength: "500mg", unitLabel: "tablet", price: 4700, threshold: 10, batchNumber: "DEV-PAN-001", quantity: 10, expiryDate: oneYearOut },
        { aroniumCode: "DEV-002", name: "Generic", strength: "500mg", unitLabel: "tablet", price: 8000, threshold: 10, batchNumber: "DEV-GEN-002", quantity: 2, expiryDate: soon },
        { aroniumCode: "DEV-005", name: "Amoxil", strength: "250mg", unitLabel: "capsule", price: 6000, threshold: 5, batchNumber: "DEV-AMX-005", quantity: 5, expiryDate: oneYearOut },
    ];

    for (const product of products) {
        const variant = await prismaClient.variant.create({
            data: {
                ingredientId: null,
                brandName: product.name,
                strength: product.strength,
                packSize: 1,
                unitLabel: product.unitLabel,
                allowsLooseSale: false,
                isActive: true,
            },
        });
        await prismaClient.aroniumProductLink.create({
            data: { aroniumCode: product.aroniumCode, variantId: variant.id, mode: "PACK", createdById: branchManager.id },
        });
        await prismaClient.branchPrice.create({
            data: { variantId: variant.id, branchId: branch.id, pricePerPack: product.price, pricePerUnit: 0, reorderThreshold: product.threshold, updatedById: adminUser.id },
        });
        await prismaClient.batch.create({
            data: {
                variantId: variant.id,
                branchId: branch.id,
                batchNumber: product.batchNumber,
                quantityReceived: product.quantity,
                quantityRemaining: product.quantity,
                expiryDate: product.expiryDate,
                receivedById: branchManager.id,
            },
        });
    }

    console.log(`Seed complete for canonical branch: ${CANONICAL_BRANCH_NAME}`);
    console.log("Login with any seeded email + password: password123");
}

export async function main() {
    process.loadEnvFile();
    const prismaClient = new PrismaClient();
    try {
        await seedCanonicalBranch(prismaClient);
    } finally {
        await prismaClient.$disconnect();
    }
}

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirectRun) {
    void main();
}