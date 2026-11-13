import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { BranchManagement } from "@/features/admin/components/BranchManagement";
import { getBranchesForAdmin } from "@/features/admin/lib/branch-queries";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/unauthorized");

    const branches = await getBranchesForAdmin();
    return <BranchManagement branches={branches} />;
}