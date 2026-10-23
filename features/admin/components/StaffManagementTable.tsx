"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { deactivateStaffAccount, reactivateStaffAccount, sendStaffPasswordReset, updateStaffRoleAndBranch } from "@/features/admin/lib/staff-actions";
import { roleLabel, STAFF_ROLES, type StaffRole } from "@/features/admin/lib/staff-rules";
import type { StaffBranchOption, StaffSummary } from "@/features/admin/lib/staff-types";

export function StaffManagementTable({ users, branches, actorId }: {
    users: StaffSummary[];
    branches: StaffBranchOption[];
    actorId: string;
}) {
    const router = useRouter();

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <header className="mb-6 border-b border-border pb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Admin workspace</p>
                <h1 className="mt-2 text-3xl text-ink">Staff management</h1>
            </header>
            <div className="overflow-x-auto border-y border-border">
                <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-border text-xs uppercase tracking-[0.1em] text-muted">
                        <tr>
                            <th className="px-3 py-3 font-normal">Name</th>
                            <th className="px-3 py-3 font-normal">Email</th>
                            <th className="px-3 py-3 font-normal">Role</th>
                            <th className="px-3 py-3 font-normal">Branch</th>
                            <th className="px-3 py-3 font-normal">Status</th>
                            <th className="px-3 py-3 font-normal">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {users.map((user) => (
                            <StaffManagementRow key={user.id} user={user} branches={branches} isSelf={user.id === actorId} onChanged={() => router.refresh()} />
                        ))}
                        {!users.length ? <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted">No staff accounts found.</td></tr> : null}
                    </tbody>
                </table>
            </div>
        </main>
    );
}

function StaffManagementRow({ user, branches, isSelf, onChanged }: {
    user: StaffSummary;
    branches: StaffBranchOption[];
    isSelf: boolean;
    onChanged: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [role, setRole] = useState<StaffRole>(user.role);
    const [branchId, setBranchId] = useState(user.branchId ?? "");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function runAction(action: () => Promise<{ ok: boolean; message: string }>) {
        setBusy(true);
        setMessage("");
        try {
            const result = await action();
            setMessage(result.message);
            if (result.ok) onChanged();
        } finally {
            setBusy(false);
        }
    }

    async function saveRoleAndBranch(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        await runAction(async () => {
            const result = await updateStaffRoleAndBranch({ userId: user.id, role, branchId: role === "ADMIN" ? null : branchId || null });
            if (result.ok) setEditing(false);
            return result;
        });
    }

    return (
        <tr className={user.isActive ? "" : "opacity-50"}>
            <td className="px-3 py-3 text-sm text-ink">{user.name}</td>
            <td className="px-3 py-3 text-sm text-muted">{user.email}</td>
            <td className="px-3 py-3 text-sm text-ink">{roleLabel(user.role)}</td>
            <td className="px-3 py-3 text-sm text-muted">{user.branch?.name ?? "All branches"}</td>
            <td className="px-3 py-3">
                <span className="border border-border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">{user.isActive ? "Active" : "Inactive"}</span>
            </td>
            <td className="px-3 py-3">
                <div className="flex min-w-52 flex-col items-start gap-2 text-sm">
                    {isSelf ? <p className="text-muted">You can't change your own account.</p> : (
                        <>
                            <button type="button" disabled={busy} onClick={() => { setEditing((value) => !value); setMessage(""); }} className="text-primary underline hover:text-ink disabled:opacity-50">
                                {editing ? "Cancel role/branch edit" : "Edit role/branch"}
                            </button>
                            {user.isActive ? (
                                <button type="button" disabled={busy} onClick={() => {
                                    if (window.confirm(`Deactivate ${user.name}?`)) void runAction(() => deactivateStaffAccount(user.id));
                                }} className="text-primary underline hover:text-ink disabled:opacity-50">Deactivate</button>
                            ) : (
                                <button type="button" disabled={busy} onClick={() => {
                                    if (window.confirm(`Reactivate ${user.name}?`)) void runAction(() => reactivateStaffAccount(user.id));
                                }} className="text-primary underline hover:text-ink disabled:opacity-50">Reactivate</button>
                            )}
                        </>
                    )}
                    <button type="button" disabled={busy || !user.isActive} onClick={() => void runAction(() => sendStaffPasswordReset(user.id))} className="text-primary underline hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
                        Send reset link
                    </button>
                    {editing && !isSelf ? (
                        <form onSubmit={saveRoleAndBranch} className="w-full space-y-2 border-l-2 border-border pl-3">
                            <label className="block text-xs text-muted">Role
                                <select value={role} onChange={(event) => {
                                    const nextRole = event.target.value as StaffRole;
                                    setRole(nextRole);
                                    if (nextRole === "ADMIN") setBranchId("");
                                }} className="mt-1 w-full border border-border bg-surface px-2 py-2 text-sm text-ink">
                                    {STAFF_ROLES.map((staffRole) => <option key={staffRole} value={staffRole}>{roleLabel(staffRole)}</option>)}
                                </select>
                            </label>
                            <label className="block text-xs text-muted">Branch
                                <select value={role === "ADMIN" ? "" : branchId} required={role !== "ADMIN"} disabled={role === "ADMIN"} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full border border-border bg-surface px-2 py-2 text-sm text-ink disabled:opacity-50">
                                    <option value="">{role === "ADMIN" ? "All branches" : "Choose branch"}</option>
                                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                                </select>
                            </label>
                            <button type="submit" disabled={busy || (role !== "ADMIN" && !branchId)} className="border border-primary px-3 py-2 text-sm text-primary disabled:opacity-50">Save</button>
                        </form>
                    ) : null}
                    {message ? <p role="status" className="text-xs text-muted">{message}</p> : null}
                </div>
            </td>
        </tr>
    );
}