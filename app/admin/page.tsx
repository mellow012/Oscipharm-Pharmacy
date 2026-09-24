import { redirect } from "next/navigation";
import { AdminDashboard } from "@/features/admin/components/AdminDashboard";
import { getAdminDashboardData } from "@/features/admin/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "users:manage")) redirect("/staff");

    const data = await getAdminDashboardData();

    return <AdminDashboard name={session.user.name} data={data} />;
}