import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { InventoryDashboard } from "@/features/inventory/components/InventoryDashboard";
import { getInventoryBranches, getInventoryData, parseInventoryEmptyToggle } from "@/features/inventory/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ branchId?: string; empty?: string | string[] }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "inventory:view")) redirect("/unauthorized");

    const params = await searchParams;
    const requestedBranchId = params.branchId;
    const showEmptyBatches = parseInventoryEmptyToggle(params.empty);
    const branches = session.user.role === "ADMIN" ? await getInventoryBranches() : [];
    const branchId = session.user.role === "ADMIN" ? requestedBranchId && branches.some((branch) => branch.id === requestedBranchId) ? requestedBranchId : branches[0]?.id : session.user.branchId;
    if (!branchId) redirect("/staff?notice=no-branch");

    const canAdjust = can(session.user.role, "stock:adjust");
    const data = await getInventoryData(branchId, showEmptyBatches);
    if (!data.branch) redirect("/staff");

    const emptyToggleHref = showEmptyBatches
        ? `/inventory?branchId=${branchId}`
        : `/inventory?branchId=${branchId}&empty=1`;

    return (
        <>
            <div className="mx-auto flex w-full max-w-[1440px] justify-end px-gutter-mobile pt-space-sm sm:px-6">
                <Link
                    href={emptyToggleHref}
                    className="inline-flex items-center rounded border border-outline-variant bg-surface px-space-sm py-space-xs text-label-sm text-primary underline-offset-4 hover:underline"
                >
                    {showEmptyBatches ? "Hide empty batches" : "Show empty batches"}
                </Link>
            </div>
            <InventoryDashboard name={session.user.name} role={session.user.role as "ADMIN" | "BRANCH_MANAGER" | "POS"} branchId={branchId} branches={branches} data={data} canReceive={can(session.user.role, "stock:receive")} canSetPrice={can(session.user.role, "price:set")} canAdjust={canAdjust} />
        </>
    );
}