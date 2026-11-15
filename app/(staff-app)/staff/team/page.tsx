import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffManagementTable } from "@/features/admin/components/StaffManagementTable";
import { listTeamForManager } from "@/features/admin/lib/staff-service";
import { filterManagementRows, getManagementStatusCounts, parseManagementStatus } from "@/features/admin/lib/branch-lifecycle-rules";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffTeamPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role === "ADMIN") redirect("/admin/staff");
    if (session.user.role !== "BRANCH_MANAGER") redirect("/unauthorized");

    const result = await listTeamForManager(session.user.id);
    if (!result.ok) redirect("/unauthorized");
    const params = await searchParams;
    const status = parseManagementStatus(params.status);
    const statusCounts = getManagementStatusCounts(result.users);
    const users = filterManagementRows(result.users, status);

    return (
        <div className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <header className="mb-6 border-b border-border pb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Staff workspace</p>
                <h1 className="mt-2 text-3xl text-ink">Team</h1>
            </header>
            <StaffManagementTable
                users={users}
                branches={[]}
                showHeader={false}
                enableStatusFilter
                status={status}
                statusCounts={statusCounts}
                preservedParams={{ status: typeof params.status === "string" ? params.status : undefined }}
            />
        </div>
    );
}