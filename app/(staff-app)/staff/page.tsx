import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/features/home/components/HomeDashboard";
import { authOptions } from "@/lib/auth";
import { getSalesFreshness } from "@/features/reports/lib/sales-queries";

export default async function StaffPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) redirect("/login");

    const freshness = await getSalesFreshness({ role: session.user.role, branchId: session.user.branchId });
    return <HomeDashboard name={session.user.name} role={session.user.role} freshness={freshness} />;
}
