import type { Prisma } from "@prisma/client";

type BranchLockClient = Pick<Prisma.TransactionClient, "$queryRaw">;

export const INACTIVE_BRANCH_WRITE_ERROR = "This branch is inactive and cannot be changed.";

export async function lockActiveBranch(tx: BranchLockClient, branchId: string): Promise<boolean> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "Branch" WHERE "id" = ${branchId} AND "isActive" = TRUE FOR UPDATE
    `;
    return rows.length > 0;
}