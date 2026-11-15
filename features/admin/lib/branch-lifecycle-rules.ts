export const BRANCH_LIFECYCLE_AUDIT_ACTIONS = [
    "BRANCH_CREATED",
    "BRANCH_UPDATED",
    "BRANCH_DEACTIVATED",
    "BRANCH_REACTIVATED",
] as const;

export type BranchDeleteBlockers = {
    branches: number;
    users: number;
    invitations: number;
    batches: number;
    prices: number;
    sales: number;
    importRuns: number;
    auditRows: number;
    lifecycleAuditRows: number;
};

const deleteBlockerLabels: Array<[keyof Omit<BranchDeleteBlockers, "branches">, string]> = [
    ["users", "staff"],
    ["invitations", "staff invitations"],
    ["batches", "stock"],
    ["prices", "branch prices"],
    ["sales", "sales"],
    ["importRuns", "import runs"],
];

export function canDeleteBranch(blockers: BranchDeleteBlockers) {
    if (blockers.branches <= 1) {
        return { allowed: false, blockers: ["last branch"], message: "The only remaining branch cannot be deleted." };
    }
    const reasons = deleteBlockerLabels.filter(([key]) => blockers[key] > 0).map(([, label]) => label);
    if (blockers.auditRows > blockers.lifecycleAuditRows) reasons.push("audit history");
    if (!reasons.length) return { allowed: true, blockers: [], message: "Branch can be deleted." };
    const summary = reasons.length === 1 ? reasons[0] : `${reasons.slice(0, -1).join(", ")} and ${reasons.at(-1)}`;
    return { allowed: false, blockers: reasons, message: `This branch still has ${summary}, so it can't be deleted. Deactivate it instead.` };
}

export function canArchiveBranch(input: { isActive: boolean; remainingBranches: number }) {
    if (input.isActive) return { allowed: false, reason: "Only a deactivated branch can be archived." };
    if (input.remainingBranches <= 1) return { allowed: false, reason: "The only remaining branch cannot be archived." };
    return { allowed: true, reason: "Branch can be archived." };
}

export function canArchiveStaff(input: { isActive: boolean; isPrimaryAdmin: boolean }) {
    if (input.isActive) return { allowed: false, reason: "Only a deactivated staff account can be archived." };
    if (input.isPrimaryAdmin) return { allowed: false, reason: "The primary admin account cannot be archived." };
    return { allowed: true, reason: "Staff account can be archived." };
}

export type ManagementStatus = "active" | "inactive" | "all" | "archived";

export function parseManagementStatus(value: string | string[] | undefined): ManagementStatus {
    const status = Array.isArray(value) ? value[0] : value;
    return status === "inactive" || status === "all" || status === "archived" ? status : "active";
}


export function ensureBranchNameInAuditDetails(details: unknown, name: string) {
    const root = details && typeof details === "object" && !Array.isArray(details)
        ? details as Record<string, unknown>
        : { previousDetails: details ?? null };
    const hasName = (value: unknown): boolean => {
        if (!value || typeof value !== "object") return false;
        if (Array.isArray(value)) return value.some(hasName);
        const record = value as Record<string, unknown>;
        if (record.name === name || record.branchName === name) return true;
        return Object.values(record).some(hasName);
    };
    return hasName(root) ? root : { ...root, branchName: name };
}

export function filterManagementRows<T extends { isActive: boolean; archivedAt: Date | string | null }>(rows: T[], status: ManagementStatus) {
    if (status === "archived") return rows.filter((row) => row.archivedAt !== null);
    if (status === "active") return rows.filter((row) => row.archivedAt === null && row.isActive);
    if (status === "inactive") return rows.filter((row) => row.archivedAt === null && !row.isActive);
    return rows;
}

export function getManagementStatusCounts<T extends { isActive: boolean; archivedAt: Date | string | null }>(rows: T[]) {
    return {
        active: rows.filter((row) => row.archivedAt === null && row.isActive).length,
        inactive: rows.filter((row) => row.archivedAt === null && !row.isActive).length,
        archived: rows.filter((row) => row.archivedAt !== null).length,
        all: rows.length,
    };
}