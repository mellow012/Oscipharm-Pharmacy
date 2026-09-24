import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const branch = await prisma.branch.findFirst({ where: { name: "Lilongwe - Area 25" } });
    const variant = await prisma.variant.findFirst({ where: { brandName: "Panadol" }, include: { branchPrices: true } });
    const cashier = await prisma.user.findUnique({ where: { email: "pos.lilongwe@pharmacy.test" } });
    if (!branch || !variant || !cashier) throw new Error("Seed records not found");
    const requestPrefix = `POS-CONCURRENCY-${Date.now()}`;
    const batch = await prisma.batch.create({ data: { variantId: variant.id, branchId: branch.id, batchNumber: `${requestPrefix}-BATCH`, quantityReceived: 1, quantityRemaining: 1, expiryDate: new Date(Date.now() + 86400000), receivedById: cashier.id } });
    const price = variant.branchPrices.find((item) => item.branchId === branch.id);
    if (!price) throw new Error("Branch price not found");
    const results = await Promise.allSettled([1, 2].map((number) => prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw`SELECT "id", "quantityRemaining" FROM "Batch" WHERE "id" = ${batch.id} AND "quantityRemaining" > 0 FOR UPDATE`;
        if (!locked.length) throw new Error("INSUFFICIENT_STOCK");
        await tx.batch.update({ where: { id: batch.id }, data: { quantityRemaining: { decrement: 1 } } });
        await tx.sale.create({ data: { branchId: branch.id, soldById: cashier.id, checkoutRequestId: `${requestPrefix}-CONCURRENT-${number}`, paymentMethod: "CASH", totalAmount: price.pricePerPack } });
        return number;
    })));
    const remaining = await prisma.batch.findUnique({ where: { id: batch.id }, select: { quantityRemaining: true } });
    await prisma.batch.delete({ where: { id: batch.id } });
    const fulfilled = results.filter((result) => result.status === "fulfilled").length;
    if (fulfilled !== 1 || remaining?.quantityRemaining !== 0) throw new Error(`Concurrency check failed: ${fulfilled} succeeded, remaining=${remaining?.quantityRemaining}`);
    const requestId = `${requestPrefix}-IDEMPOTENT`;
    const first = await prisma.sale.create({ data: { branchId: branch.id, soldById: cashier.id, checkoutRequestId: requestId, paymentMethod: "CASH", totalAmount: price.pricePerPack } });
    let duplicate;
    try {
        await prisma.sale.create({ data: { branchId: branch.id, soldById: cashier.id, checkoutRequestId: requestId, paymentMethod: "CASH", totalAmount: price.pricePerPack } });
    } catch (error) {
        if (error.code !== "P2002") throw error;
        duplicate = await prisma.sale.findUnique({ where: { soldById_checkoutRequestId: { soldById: cashier.id, checkoutRequestId: requestId } } });
    }
    await prisma.sale.deleteMany({ where: { checkoutRequestId: { startsWith: requestPrefix } } });
    if (!duplicate || duplicate.id !== first.id) throw new Error("Idempotency check failed");
    console.log(JSON.stringify({ passed: true, fulfilled, rejected: results.length - fulfilled, remaining: remaining.quantityRemaining, idempotency: "duplicate returned existing sale" }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());