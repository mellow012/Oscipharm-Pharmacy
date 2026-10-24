import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { StaffCatalogWorkspace } from "@/features/catalog/components/StaffCatalogWorkspace";
import { getStaffCatalogBranches, getStaffCatalogData } from "@/features/catalog/lib/staff-queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function StaffCatalogPage({
    searchParams,
}: {
    searchParams: Promise<{ branchId?: string }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "catalog:manage")) redirect("/unauthorized");

    const params = await searchParams;
    const availableBranches = session.user.role === "ADMIN" ? await getStaffCatalogBranches() : [];
    const requestedBranchId = params.branchId && availableBranches.some((branch) => branch.id === params.branchId) ? params.branchId : null;
    const branchId = session.user.role === "ADMIN" ? requestedBranchId ?? availableBranches[0]?.id : session.user.branchId;
    if (!branchId) redirect("/staff");

    const { categories, uncategorizedVariants } = await getStaffCatalogData(branchId);

    return (
        <StaffCatalogWorkspace
            categories={categories}
            uncategorizedVariants={uncategorizedVariants}
            branchId={branchId}
            branches={availableBranches}
            role={session.user.role as "ADMIN" | "BRANCH_MANAGER"}
        />
    );
}
