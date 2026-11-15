import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { BranchManagement } from "@/features/admin/components/BranchManagement";
import { StaffInvitations } from "@/features/admin/components/StaffInvitations";
import { StaffManagementTable } from "@/features/admin/components/StaffManagementTable";
import { getBranchesForAdmin } from "@/features/admin/lib/branch-queries";
import { filterManagementRows, getManagementStatusCounts, parseManagementStatus } from "@/features/admin/lib/branch-lifecycle-rules";
import { listPendingInvitations } from "@/features/admin/lib/staff-invitation-service";
import { listStaffBranchesForAdmin, listStaffForAdmin } from "@/features/admin/lib/staff-service";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[]; branchId?: string | string[]; status?: string | string[] }> }) {
    const params = await searchParams;
    const activeTab = params.tab === "branches" ? "branches" : "staff";
    const selectedBranchId = typeof params.branchId === "string" ? params.branchId : "";
    const status = parseManagementStatus(params.status);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/unauthorized");

    const [staffResult, branchResult, invitationResult] = await Promise.all([
        listStaffForAdmin(session.user.id),
        listStaffBranchesForAdmin(session.user.id),
        listPendingInvitations(session.user.id),
    ]);
    if (!staffResult.ok || !branchResult.ok || !invitationResult.ok) redirect("/unauthorized");

    const branches = await getBranchesForAdmin();
    const statusCounts = getManagementStatusCounts(staffResult.users);
    const filteredStaff = filterManagementRows(staffResult.users, status);
    const staffUsers = selectedBranchId ? filteredStaff.filter((user) => user.branchId === selectedBranchId) : filteredStaff;
    const branchStatusCounts = getManagementStatusCounts(branches);
    const visibleBranches = filterManagementRows(branches, status);
    const preservedParams = {
        tab: typeof params.tab === "string" ? params.tab : undefined,
        branchId: typeof params.branchId === "string" ? params.branchId : undefined,
        status: typeof params.status === "string" ? params.status : undefined,
    };
    const staffTabQuery = new URLSearchParams();
    if (preservedParams.branchId) staffTabQuery.set("branchId", preservedParams.branchId);
    if (preservedParams.status) staffTabQuery.set("status", preservedParams.status);
    const branchTabQuery = new URLSearchParams({ tab: "branches" });
    if (preservedParams.status) branchTabQuery.set("status", preservedParams.status);

    const invitations = invitationResult.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        branch: invitation.branch,
        expiresAt: invitation.expiresAt.toISOString(),
        emailSentAt: invitation.emailSentAt?.toISOString() ?? null,
    }));

    return (
        <div className="mx-auto min-h-screen w-full max-w-7xl px-5 py-8 sm:px-8">
            <header className="mb-6 border-b border-border pb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Admin workspace</p>
                <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h1 className="text-3xl text-ink sm:text-4xl">Staff &amp; Branches</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted">
                            Manage access requests, staff assignments, and branch records from one admin workspace.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <a
                            href={`/admin/staff${staffTabQuery.size ? `?${staffTabQuery.toString()}` : ""}`}
                            aria-current={activeTab === "staff" ? "page" : undefined}
                            className={`rounded-sm border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === "staff" ? "border-primary bg-primary text-primary-fg" : "border-border text-primary hover:bg-chip"}`}
                        >
                            Staff directory
                        </a>
                        <a
                            href={`/admin/staff?${branchTabQuery.toString()}`}
                            aria-current={activeTab === "branches" ? "page" : undefined}
                            className={`rounded-sm border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${activeTab === "branches" ? "border-primary bg-primary text-primary-fg" : "border-border text-primary hover:bg-chip"}`}
                        >
                            Branch locations
                        </a>
                    </div>
                </div>
            </header>

            {activeTab === "branches" ? (
                <BranchManagement branches={visibleBranches} showHeader={false} status={status} statusCounts={branchStatusCounts} preservedParams={preservedParams} />
            ) : (
                <>
                    <StaffInvitations branches={branchResult.branches} invitations={invitations} />
                    <StaffManagementTable
                        users={staffUsers}
                        branches={branchResult.branches}
                        actorId={session.user.id}
                        showHeader={false}
                        enableBranchFilter
                        selectedBranchId={selectedBranchId}
                        enableStatusFilter
                        status={status}
                        statusCounts={statusCounts}
                        preservedParams={preservedParams}
                    />
                </>
            )}
        </div>
    );
}