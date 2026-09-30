import { redirect } from "next/navigation";
import { MembershipApplications } from "@/features/membership/components/MembershipApplications";
import { getMembershipApplications } from "@/features/membership/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function MembershipsAdminPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "membership:manage")) redirect("/staff");

    const applications = await getMembershipApplications();
    return <MembershipApplications applications={applications} />;
}
