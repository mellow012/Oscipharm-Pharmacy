import { redirect } from "next/navigation";
import { MembershipApplications } from "@/features/membership/components/MembershipApplications";
import { getMembershipApplications } from "@/features/membership/lib/queries";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

export default async function MembershipsAdminPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!can(session.user.role, "membership:manage")) redirect("/staff");

    const [params, allApplications] = await Promise.all([searchParams, getMembershipApplications()]);
    const query = typeof params.q === "string" ? params.q.trim() : "";
    const normalizedQuery = query.toLocaleLowerCase();
    const applications = normalizedQuery
        ? allApplications.filter((application) =>
            application.fullName.toLocaleLowerCase().includes(normalizedQuery)
            || application.phone.toLocaleLowerCase().includes(normalizedQuery))
        : allApplications;

    return <MembershipApplications applications={applications} query={query} totalCount={allApplications.length} />;
}
