import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { MemberLookup } from "@/features/membership/components/MemberLookup";
import { searchMembersForDispensing } from "@/features/membership/lib/member-lookup-service";
import { getMemberLookupQuery } from "@/features/membership/lib/member-lookup";
import { getMembersAccess } from "@/lib/permissions";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffMembersPage({ searchParams }: {
    searchParams: Promise<{ q?: string | string[] }>;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");
    if (!getMembersAccess(session.user.role).view) redirect("/unauthorized");

    const params = await searchParams;
    const query = getMemberLookupQuery(typeof params.q === "string" ? params.q : "");
    const members = query.length >= 2 ? await searchMembersForDispensing(session.user.role, query) : [];

    return <MemberLookup members={members} query={query} role={session.user.role} />;
}