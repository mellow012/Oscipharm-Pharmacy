import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ReportsDashboard } from "@/features/reports/components/ReportsDashboard";
import { getReportsData, getReportBranches } from "@/features/reports/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getMalawiDateKey } from "@/lib/timezone";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ branchId?: string; from?: string; to?: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "reports:branch:view")) redirect("/unauthorized");

    const params = await searchParams;
    const branches = session.user.role === "ADMIN" ? await getReportBranches() : [];
    const requestedBranchId = params.branchId && branches.some((branch) => branch.id === params.branchId) ? params.branchId : null;
    const branchId = session.user.role === "ADMIN" ? requestedBranchId : session.user.branchId;
    const today = getMalawiDateKey(new Date());
    const previousWeek = getMalawiDateKey(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const range = {
        from: params.from ?? previousWeek,
        to: params.to ?? today,
    };

    const data = await getReportsData({ branchId, from: range.from, to: range.to });

    return <ReportsDashboard name={session.user.name} role={session.user.role as "ADMIN" | "BRANCH_MANAGER"} branchId={branchId} branches={branches} data={data} />;
}
