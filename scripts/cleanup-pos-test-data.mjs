#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";

const args = new Set(process.argv.slice(2));
const confirmed = args.has("--confirm");
const dryRun = args.has("--dry-run") && confirmed;
const databaseUrl = process.env.DATABASE_URL || "";
const host = databaseUrl ? (() => {
    try {
        const { hostname } = new URL(databaseUrl);
        return hostname;
    } catch {
        return "unknown";
    }
})() : "unknown";

console.log(`Database host: ${host}`);

if (process.env.NODE_ENV === "production") {
    console.error("Refusing to run cleanup in production.");
    process.exit(2);
}

if (!confirmed) {
    console.error("Refusing to run cleanup without --confirm.");
    process.exit(2);
}

console.log(`Mode: ${dryRun ? "dry-run" : "apply"}`);

const prisma = new PrismaClient();

const knownSaleIds = [
    "cmufxwmm100021imhsr39q8zp",
    "cmufxwyh500081imhcttxepgq",
    "cmufy030c000h1imhxteubgbk",
    "cmufy3jly000t1imhl0xihi8y",
    "cmufz0pd2000z1imhpwf5epuq",
    "cmufzabt700161imhvtpxtbfk",
];

async function main() {
    const salesById = await prisma.sale.findMany({
        where: { id: { in: knownSaleIds } },
        select: { id: true, checkoutRequestId: true },
    });

    const testSales = await prisma.sale.findMany({
        where: {
            OR: [
                { checkoutRequestId: { startsWith: "POS-" } },
                { checkoutRequestId: { startsWith: "TEST-" } },
                { checkoutRequestId: { startsWith: "MANUAL-" } },
                { checkoutRequestId: { startsWith: "TAMPER-" } },
                { id: { in: knownSaleIds } },
            ],
        },
        select: { id: true, checkoutRequestId: true },
    });
    const saleIds = [...new Set([...salesById.map((sale) => sale.id), ...testSales.map((sale) => sale.id)])];

    const testBatches = await prisma.batch.findMany({
        where: {
            OR: [
                { batchNumber: { startsWith: "POS-" } },
                { batchNumber: { startsWith: "TEST-" } },
                { batchNumber: { startsWith: "MANUAL-" } },
                { batchNumber: { startsWith: "TAMPER-" } },
            ],
        },
        select: { id: true, batchNumber: true },
    });

    const batchIds = testBatches.map((batch) => batch.id);

    console.log("Would delete sale audit rows:");
    for (const sale of testSales) console.log(`  - sale ${sale.id} (${sale.checkoutRequestId})`);
    console.log("Would delete sale items for those sales:");
    console.log(`  - ${saleIds.length} sale IDs matched`);
    console.log("Would delete test batches:");
    for (const batch of testBatches) console.log(`  - ${batch.batchNumber} (${batch.id})`);
    console.log("Would restore baseline stock by rerunning prisma/seed.ts");

    if (!dryRun) {
        await prisma.auditLog.deleteMany({ where: { saleId: { in: saleIds } } });
        await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } });
        await prisma.sale.deleteMany({ where: { id: { in: saleIds } } });
        await prisma.batch.deleteMany({ where: { id: { in: batchIds } } });
        console.log("Cleanup applied.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});
