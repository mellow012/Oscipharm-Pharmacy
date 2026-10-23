export const STAFF_ROLES = ["ADMIN", "BRANCH_MANAGER", "POS"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export function roleLabel(role: StaffRole): "Admin" | "Branch manager" | "Sales" {
    if (role === "ADMIN") return "Admin";
    if (role === "BRANCH_MANAGER") return "Branch manager";
    return "Sales";
}

export function validateRoleBranch({ role, branchId }: { role: unknown; branchId: string | null }): { ok: true } | { ok: false; message: string } {
    if (!STAFF_ROLES.some((staffRole) => staffRole === role)) {
        return { ok: false, message: "Choose a valid staff role." };
    }
    if (role === "ADMIN" && branchId !== null) {
        return { ok: false, message: "Admin accounts must not be assigned to a branch." };
    }
    if (role !== "ADMIN" && (typeof branchId !== "string" || branchId.trim().length === 0)) {
        return { ok: false, message: "Choose a branch for this role." };
    }
    return { ok: true };
}

export function wouldRemoveLastActiveAdmin({ targetIsActiveAdmin, activeAdminCount }: {
    targetIsActiveAdmin: boolean;
    activeAdminCount: number;
}): boolean {
    return targetIsActiveAdmin && activeAdminCount <= 1;
}

export function decideSelfAction({ actorId, targetId, action }: {
    actorId: string;
    targetId: string;
    action: "deactivate" | "change_role" | "change_branch" | "reactivate" | "reset_link";
}): { ok: true } | { ok: false; message: string } {
    if (actorId === targetId && (action === "deactivate" || action === "change_role")) {
        return { ok: false, message: "You can't change your own account." };
    }
    return { ok: true };
}