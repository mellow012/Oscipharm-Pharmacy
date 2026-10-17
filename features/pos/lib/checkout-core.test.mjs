import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { checkoutInTransaction } from "./checkout-core.ts";

test("checkout records shortages as unallocated sale items", async () => {
    let createdData;
    const tx = {
        variant: {
            findMany: async () => [{
                id: "variant-1",
                packSize: 1,
                allowsLooseSale: false,
                brandName: "Brand",
                strength: null,
                ingredient: null,
                branchPrices: [{ pricePerPack: new Prisma.Decimal(10), pricePerUnit: new Prisma.Decimal(0) }],
            }],
        },
        $queryRaw: async () => [{
            id: "batch-1",
            variantId: "variant-1",
            quantityRemaining: 1,
            expiryDate: new Date(Date.now() + 86400000),
        }],
        $executeRaw: async () => 1,
        membershipApplication: { findFirst: async () => null },
        sale: {
            create: async ({ data }) => {
                createdData = data;
                return {
                    id: "sale-1",
                    subtotalAmount: data.subtotalAmount,
                    discountAmount: data.discountAmount,
                    membershipDiscountPercent: data.membershipDiscountPercent,
                    totalAmount: data.totalAmount,
                    paymentMethod: data.paymentMethod,
                };
            },
        },
    };

    const result = await checkoutInTransaction(tx, {
        branchId: "branch-1",
        soldById: "user-1",
        paymentMethod: "CASH",
        lines: [{ variantId: "variant-1", mode: "PACK", quantity: 3 }],
        expectedTotal: new Prisma.Decimal(30),
        membershipApplicationId: null,
    });

    const rows = createdData.items.createMany.data;
    assert.equal(result.sale.id, "sale-1");
    assert.deepEqual(rows.map(({ batchId, quantityUnits, unallocatedUnits }) => ({ batchId, quantityUnits, unallocatedUnits })), [
        { batchId: "batch-1", quantityUnits: 1, unallocatedUnits: 0 },
        { batchId: null, quantityUnits: 2, unallocatedUnits: 2 },
    ]);
    assert.equal(result.labels.get("variant-1"), "Brand");
});