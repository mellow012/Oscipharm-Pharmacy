import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { InventoryDashboard } from "@/features/inventory/components/InventoryDashboard";
import { getInventoryBranches, getInventoryData } from "@/features/inventory/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "stock:receive") && !can(session.user.role, "price:set")) redirect("/unauthorized");

    const requestedBranchId = (await searchParams).branchId;
    const branches = session.user.role === "ADMIN" ? await getInventoryBranches() : [];
    const branchId = session.user.role === "ADMIN" ? requestedBranchId && branches.some((branch) => branch.id === requestedBranchId) ? requestedBranchId : branches[0]?.id : session.user.branchId;
    if (!branchId) redirect("/staff");

    const data = await getInventoryData(branchId);
    if (!data.branch) redirect("/staff");

    return <InventoryDashboard name={session.user.name} role={session.user.role as "ADMIN" | "BRANCH_MANAGER"} branchId={branchId} branches={branches} data={data} />;
}