import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffManagementTable } from "@/features/admin/components/StaffManagementTable";
import { listStaffBranchesForAdmin, listStaffForAdmin } from "@/features/admin/lib/staff-service";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/unauthorized");

    const [staffResult, branchResult] = await Promise.all([
        listStaffForAdmin(session.user.id),
        listStaffBranchesForAdmin(session.user.id),
    ]);
    if (!staffResult.ok || !branchResult.ok) redirect("/unauthorized");

    return <StaffManagementTable users={staffResult.users} branches={branchResult.branches} actorId={session.user.id} />;
}