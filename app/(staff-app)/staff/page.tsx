import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/features/home/components/HomeDashboard";
import { authOptions } from "@/lib/auth";
import { getSalesFreshness } from "@/features/reports/lib/sales-queries";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
    const session = await getServerSession(authOptions);

    if (!session?.user) redirect("/login");

    const params = await searchParams;
    const showNoBranchNotice = params.notice === "no-branch";
    const freshness = await getSalesFreshness({ role: session.user.role, branchId: session.user.branchId });
    return <>
        {showNoBranchNotice ? <p role="status" className="mx-auto mt-5 w-full max-w-4xl border-l-4 border-warn bg-warn-bg/50 px-4 py-3 text-sm text-ink">Your account isn&apos;t assigned to a branch yet. Ask an administrator to assign one.</p> : null}
        <HomeDashboard name={session.user.name} role={session.user.role} freshness={freshness} />
    </>;
}
