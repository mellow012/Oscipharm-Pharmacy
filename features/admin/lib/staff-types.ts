import type { Role } from "@prisma/client";

export type StaffSummary = {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    branchId: string | null;
    createdAt: Date;
    branch: { name: string } | null;
};

export type StaffBranchOption = { id: string; name: string };

export type StaffActionResult = { ok: true; message: string } | { ok: false; message: string };
export type StaffListResult = { ok: true; users: StaffSummary[] } | { ok: false; message: string };
export type StaffBranchesResult = { ok: true; branches: StaffBranchOption[] } | { ok: false; message: string };