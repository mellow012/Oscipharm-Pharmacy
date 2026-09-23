import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    // --- Branches -------------------------------------------------------
    const lilongwe = await prisma.branch.create({
        data: { name: "Lilongwe - Area 25", location: "Lilongwe, Malawi" },
    });
    const blantyre = await prisma.branch.create({
        data: { name: "Blantyre - Town and Lunzu", location: "Blantyre, Malawi" },
    });
    const mzuzu = await prisma.branch.create({
        data: { name: "Mzuzu - Hope Square", location: "Mzuzu, Malawi" },
    });

    // --- Users (admin + branch managers + POS per branch) ---
    const passwordHash = await bcrypt.hash("password123", 10); // seed-only, change before real use

    const users = await Promise.all([
        prisma.user.create({
            data: {
                name: "Admin User",
                email: "admin@pharmacy.test",
                passwordHash,
                role: Role.ADMIN,
                branchId: null,
            },
        }),
        prisma.user.create({
            data: {
                name: "Lilongwe Manager",
                email: "manager.lilongwe@pharmacy.test",
                passwordHash,
                role: Role.BRANCH_MANAGER,
                branchId: lilongwe.id,
            },
        }),
        prisma.user.create({
            data: {
                name: "Lilongwe POS",
                email: "pos.lilongwe@pharmacy.test",
                passwordHash,
                role: Role.POS,
                branchId: lilongwe.id,
            },
        }),
        prisma.user.create({
            data: {
                name: "Blantyre Manager",
                email: "manager.blantyre@pharmacy.test",
                passwordHash,
                role: Role.BRANCH_MANAGER,
                branchId: blantyre.id,
            },
        }),
        prisma.user.create({
            data: {
                name: "Mzuzu Manager",
                email: "manager.mzuzu@pharmacy.test",
                passwordHash,
                role: Role.BRANCH_MANAGER,
                branchId: mzuzu.id,
            },
        }),
    ]);
    // Branch Manager now covers stock-receiving duties directly — no separate
    // Inventory role/user exists.
    const lilongweManager = users[1];

    // --- Catalog: Category -> Ingredient -> Variant ---------------------
    const painRelief = await prisma.category.create({
        data: { name: "Pain Relief" },
    });
    const antibiotics = await prisma.category.create({
        data: { name: "Antibiotics" },
    });

    const paracetamol = await prisma.ingredient.create({
        data: { name: "Paracetamol", categoryId: painRelief.id },
    });
    const amoxicillin = await prisma.ingredient.create({
        data: { name: "Amoxicillin", categoryId: antibiotics.id },
    });

    const panadol500 = await prisma.variant.create({
        data: {
            ingredientId: paracetamol.id,
            brandName: "Panadol",
            strength: "500mg",
            packSize: 20,
            unitLabel: "tablet",
            allowsLooseSale: true,
        },
    });
    const genericParacetamol500 = await prisma.variant.create({
        data: {
            ingredientId: paracetamol.id,
            brandName: "Generic",
            strength: "500mg",
            packSize: 100,
            unitLabel: "tablet",
            allowsLooseSale: true,
        },
    });
    const amoxil250 = await prisma.variant.create({
        data: {
            ingredientId: amoxicillin.id,
            brandName: "Amoxil",
            strength: "250mg",
            packSize: 10,
            unitLabel: "capsule",
            allowsLooseSale: true,
        },
    });

    // --- Branch pricing ---------------------------------------------------
    await prisma.branchPrice.createMany({
        data: [
            { variantId: panadol500.id, branchId: lilongwe.id, pricePerPack: 4500, pricePerUnit: 250, reorderThreshold: 40 },
            { variantId: panadol500.id, branchId: blantyre.id, pricePerPack: 4700, pricePerUnit: 260, reorderThreshold: 40 },
            { variantId: genericParacetamol500.id, branchId: lilongwe.id, pricePerPack: 8000, pricePerUnit: 90, reorderThreshold: 100 },
            { variantId: amoxil250.id, branchId: lilongwe.id, pricePerPack: 6000, pricePerUnit: 650, reorderThreshold: 20 },
        ],
    });

    // --- Batches (stock on hand) -------------------------------------------
    const oneYearOut = new Date();
    oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

    const soon = new Date();
    soon.setDate(soon.getDate() + 20); // deliberately near-expiry, to test the alert feature

    await prisma.batch.createMany({
        data: [
            {
                variantId: panadol500.id,
                branchId: lilongwe.id,
                batchNumber: "PAN-2026-01",
                quantityReceived: 10, // packs
                quantityRemaining: 200, // units (10 packs * 20 tablets)
                expiryDate: oneYearOut,
                receivedById: lilongweManager.id,
            },
            {
                variantId: genericParacetamol500.id,
                branchId: lilongwe.id,
                batchNumber: "GEN-2025-11",
                quantityReceived: 2,
                quantityRemaining: 200,
                expiryDate: soon,
                receivedById: lilongweManager.id,
            },
            {
                variantId: amoxil250.id,
                branchId: lilongwe.id,
                batchNumber: "AMX-2026-02",
                quantityReceived: 5,
                quantityRemaining: 50,
                expiryDate: oneYearOut,
                receivedById: lilongweManager.id,
            },
        ],
    });

    console.log("Seed complete.");
    console.log("Login with any seeded email + password: password123");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });