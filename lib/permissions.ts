import { Role } from "@prisma/client";

// Every distinct action the app can gate. Keep this list flat and specific —
// it's easier to grant a role a new permission than to untangle a vague one.
export type Permission =
    | "stock:receive"       // record a new batch
    | "stock:adjust"        // manual stock corrections
    | "price:set"           // set/update branch pricing
    | "pos:checkout"        // complete a sale
    | "reports:branch:view" // view this branch's sales/audit history
    | "reports:global:view" // view all branches' reports
    | "users:manage"        // create/edit/deactivate users
    | "branches:manage";    // create/edit branches

// If the client ever wants role permissions to be configurable, this map is
// the thing to move into the DB for a v2 — for now it's intentionally static.
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    ADMIN: [
        "stock:receive",
        "stock:adjust",
        "price:set",
        "pos:checkout",
        "reports:branch:view",
        "reports:global:view",
        "users:manage",
        "branches:manage",
    ],
    BRANCH_MANAGER: [
        "stock:receive",
        "stock:adjust",
        "price:set",
        "pos:checkout",
        "reports:branch:view",
    ],
    POS: ["pos:checkout"],
};

export function can(role: Role, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission);
}

// Convenience for "this user + this permission + this branch's resource".
// Admins bypass the branch check entirely; everyone else must match branchId.
export function canOnBranch(
    user: { role: Role; branchId: string | null },
    permission: Permission,
    resourceBranchId: string
): boolean {
    if (!can(user.role, permission)) return false;
    if (user.role === "ADMIN") return true;
    return user.branchId === resourceBranchId;
}