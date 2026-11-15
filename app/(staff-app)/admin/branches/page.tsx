import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminBranchesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role !== "ADMIN") redirect("/unauthorized");

    redirect("/admin/staff?tab=branches");
}