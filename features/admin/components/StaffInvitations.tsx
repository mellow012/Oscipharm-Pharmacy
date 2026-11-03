"use client";

import { useState, type FormEvent } from "react";
import { inviteStaff, resendStaffInvitation, revokeStaffInvitation } from "@/features/admin/lib/staff-invitation-actions";
import { roleLabel, STAFF_ROLES, type StaffRole } from "@/features/admin/lib/staff-rules";
import type { StaffBranchOption } from "@/features/admin/lib/staff-types";
import { formatBlantyreDateTime } from "@/lib/timezone";

type PendingInvitation = {
    id: string;
    email: string;
    role: StaffRole;
    branch: { name: string } | null;
    expiresAt: string;
    emailSentAt: string | null;
};

export function StaffInvitations({ branches, invitations }: { branches: StaffBranchOption[]; invitations: PendingInvitation[] }) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<StaffRole>("BRANCH_MANAGER");
    const [branchId, setBranchId] = useState("");
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            const result = await inviteStaff({ email, role, branchId: role === "ADMIN" ? null : branchId || null });
            setMessage(result.message);
            if (result.ok) {
                setEmail("");
                setBranchId("");
            }
        } finally {
            setBusy(false);
        }
    }

    async function runInvitationAction(action: () => Promise<{ ok: boolean; message: string }>) {
        setBusy(true);
        setMessage("");
        try {
            const result = await action();
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-8">
            <div className="border border-border bg-surface p-5 sm:p-6">
                <header className="mb-5 border-b border-border pb-5">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Staff access</p>
                    <h2 className="mt-2 text-2xl text-ink">Invite staff</h2>
                </header>
                <form onSubmit={submit} className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                    <label className="block text-sm text-ink">
                        Email address
                        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className="mt-1 w-full border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </label>
                    <label className="block text-sm text-ink">
                        Role
                        <select value={role} onChange={(event) => { const nextRole = event.target.value as StaffRole; setRole(nextRole); if (nextRole === "ADMIN") setBranchId(""); }} className="mt-1 w-full border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                            {STAFF_ROLES.map((staffRole) => <option key={staffRole} value={staffRole}>{roleLabel(staffRole)}</option>)}
                        </select>
                    </label>
                    <label className="block text-sm text-ink">
                        Branch
                        <select value={role === "ADMIN" ? "" : branchId} required={role !== "ADMIN"} disabled={role === "ADMIN"} onChange={(event) => setBranchId(event.target.value)} className="mt-1 w-full border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50">
                            <option value="">{role === "ADMIN" ? "All branches" : "Choose branch"}</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </select>
                    </label>
                    <button type="submit" disabled={busy || (role !== "ADMIN" && !branchId)} className="border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-50">{busy ? "Working..." : "Send invitation"}</button>
                </form>
                {message ? <p role="status" className="mt-4 border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm text-ink">{message}</p> : null}

                <div className="mt-8">
                    <h3 className="mb-3 text-lg text-ink">Pending invitations</h3>
                    <div className="space-y-3">
                        {invitations.map((invitation) => (
                            <div key={invitation.id} className="border border-border p-4 text-sm">
                                <div className="space-y-1 text-ink">
                                    <p className="break-all font-medium">{invitation.email}</p>
                                    <p className="text-muted">{roleLabel(invitation.role)} · {invitation.branch?.name ?? "All branches"}</p>
                                    <p className="text-muted">Expires {formatBlantyreDateTime(new Date(invitation.expiresAt))}</p>
                                    {invitation.emailSentAt === null ? <p className="text-danger">Email not sent</p> : null}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    <button type="button" disabled={busy} onClick={() => void runInvitationAction(() => resendStaffInvitation(invitation.id))} className="text-primary underline hover:text-ink disabled:opacity-50">Resend</button>
                                    <button type="button" disabled={busy} onClick={() => void runInvitationAction(() => revokeStaffInvitation(invitation.id))} className="text-primary underline hover:text-ink disabled:opacity-50">Revoke</button>
                                </div>
                            </div>
                        ))}
                        {!invitations.length ? <p className="text-sm text-muted">No pending invitations.</p> : null}
                    </div>
                </div>
            </div>
        </section>
    );
}