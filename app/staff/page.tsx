import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { HomeDashboard } from "@/features/home/components/HomeDashboard";
import { authOptions } from "@/lib/auth";

export default async function StaffPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user) redirect("/login");

    return <HomeDashboard name={session.user.name} role={session.user.role} />;
}
