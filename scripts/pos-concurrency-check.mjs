import { PrismaClient } from "@prisma/client";
import { checkoutInTransaction } from "../features/pos/lib/checkout-core.ts";

const prisma = new PrismaClient();

async function removeTestRecords(prefix) {
    const sales = await prisma.sale.findMany({ where: { checkoutRequestId: { startsWith: prefix } }, select: { id: true } });
    await prisma.auditLog.deleteMany({ where: { saleId: { in: sales.map((sale) => sale.id) } } });
    await prisma.saleItem.deleteMany({ where: { saleId: { in: sales.map((sale) => sale.id) } } });
    await prisma.sale.deleteMany({ where: { id: { in: sales.map((sale) => sale.id) } } });
    await prisma.batch.deleteMany({ where: { batchNumber: { startsWith: prefix } } });
}

async function main() {
    const branch = await prisma.branch.findFirst({ where: { name: "Blantyre Town Lunzu" } });
    const variant = await prisma.variant.findFirst({ where: { brandName: "Panadol" }, include: { branchPrices: true } });
    const cashier = await prisma.user.findUnique({ where: { email: "pos.blantyre@local.dev" } });
    if (!branch || !variant || !cashier) throw new Error("Canonical seed records not found");
    const price = variant.branchPrices.find((item) => item.branchId === branch.id);
    if (!price) throw new Error("Branch price not found");
    const prefix = `POS-CONCURRENCY-${Date.now()}`;
    const input = (requestId) => ({ branchId: branch.id, soldById: cashier.id, requestId, paymentMethod: "CASH", lines: [{ variantId: variant.id, mode: "UNIT", quantity: 1 }], expectedTotal: price.pricePerUnit });
    const baseline = await prisma.batch.findMany({ where: { variantId: variant.id, branchId: branch.id }, select: { id: true, quantityRemaining: true } });
    await prisma.batch.updateMany({ where: { variantId: variant.id, branchId: branch.id }, data: { quantityRemaining: 0 } });

    try {
        await prisma.batch.create({ data: { variantId: variant.id, branchId: branch.id, batchNumber: `${prefix}-STOCK`, quantityReceived: 1, quantityRemaining: 1, expiryDate: new Date(Date.now() + 86400000), receivedById: cashier.id } });
        const contention = await Promise.allSettled(["A", "B"].map((suffix) => prisma.$transaction((tx) => checkoutInTransaction(tx, input(`${prefix}-${suffix}`)), { maxWait: 15000, timeout: 15000 })));
        const contentionFulfilled = contention.filter((result) => result.status === "fulfilled").length;
        const stock = await prisma.batch.findFirst({ where: { batchNumber: `${prefix}-STOCK` }, select: { quantityRemaining: true } });
        const sales = await prisma.sale.findMany({ where: { checkoutRequestId: { startsWith: prefix } }, select: { id: true } });
        const unallocatedCount = await prisma.saleItem.count({ where: { saleId: { in: sales.map((sale) => sale.id) }, batchId: null, unallocatedUnits: { gt: 0 } } });
        if (contentionFulfilled !== 2 || stock?.quantityRemaining !== 0 || unallocatedCount !== 1) {
            throw new Error(`Shortage recording failed: ${contentionFulfilled} sales, unallocated=${unallocatedCount}, remaining=${stock?.quantityRemaining}`);
        }
        await removeTestRecords(prefix);
        console.log(JSON.stringify({ passed: true, contentionFulfilled, unallocatedCount }));
    } finally {
        await removeTestRecords(prefix);
        for (const batch of baseline) await prisma.batch.update({ where: { id: batch.id }, data: { quantityRemaining: batch.quantityRemaining } });
    }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
