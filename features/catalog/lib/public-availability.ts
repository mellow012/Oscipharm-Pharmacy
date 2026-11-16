import { isExpiredInMalawi } from "../../../lib/timezone.ts";

export type PublicAvailabilityStatus = "out-of-stock" | "low-stock" | "in-stock";

export type AvailabilityBranchInput = {
    id: string;
    isActive: boolean;
    archivedAt: Date | null;
    reorderThreshold: number | null;
    batches: Array<{
        quantityRemaining: number;
        expiryDate: Date;
        expiryDateKnown: boolean;
    }>;
};

export type PublicAvailability = {
    status: PublicAvailabilityStatus;
    branches: Array<{ branchId: string; status: PublicAvailabilityStatus }>;
};

function branchAvailability(branch: AvailabilityBranchInput, now: Date): PublicAvailabilityStatus {
    const sellableUnits = branch.batches.reduce((total, batch) => {
        const sellable = batch.quantityRemaining > 0
            && (!batch.expiryDateKnown || !isExpiredInMalawi(batch.expiryDate, now));
        return sellable ? total + batch.quantityRemaining : total;
    }, 0);

    if (sellableUnits === 0) return "out-of-stock";
    if (branch.reorderThreshold !== null && sellableUnits <= branch.reorderThreshold) return "low-stock";
    return "in-stock";
}

export function getPublicAvailability(branches: AvailabilityBranchInput[], now = new Date()): PublicAvailability {
    const activeBranches = branches.filter((branch) => branch.isActive && branch.archivedAt === null);
    const branchStatuses = activeBranches.map((branch) => ({
        branchId: branch.id,
        status: branchAvailability(branch, now),
    }));

    if (branchStatuses.every((branch) => branch.status === "out-of-stock")) {
        return { status: "out-of-stock", branches: branchStatuses };
    }

    return {
        status: branchStatuses.some((branch) => branch.status === "low-stock") ? "low-stock" : "in-stock",
        branches: branchStatuses,
    };
}