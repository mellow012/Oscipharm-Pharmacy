import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffInvitations } from "@/features/admin/components/StaffInvitations";
import { StaffManagementTable } from "@/features/admin/components/StaffManagementTable";
import { listPendingInvitations } from "@/features/admin/lib/staff-invitation-service";
import { listStaffBranchesForAdmin, listStaffForAdmin } from "@/features/admin/lib/staff-service";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/unauthorized");

    const [staffResult, branchResult, invitationResult] = await Promise.all([
        listStaffForAdmin(session.user.id),
        listStaffBranchesForAdmin(session.user.id),
        listPendingInvitations(session.user.id),
    ]);
    if (!staffResult.ok || !branchResult.ok || !invitationResult.ok) redirect("/unauthorized");

    const invitations = invitationResult.invitations.map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        branch: invitation.branch,
        expiresAt: invitation.expiresAt.toISOString(),
        emailSentAt: invitation.emailSentAt?.toISOString() ?? null,
    }));

    return (
        <>
            <StaffInvitations branches={branchResult.branches} invitations={invitations} />
            <StaffManagementTable users={staffResult.users} branches={branchResult.branches} actorId={session.user.id} />
        </>
    );
}