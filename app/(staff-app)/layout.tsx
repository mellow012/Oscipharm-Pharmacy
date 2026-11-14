import { getServerSession } from "next-auth";
import { StaffAppShell } from "@/features/marketing/components/StaffAppShell";
import { getStaffNavigation } from "@/features/marketing/lib/staff-navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StaffAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await getServerSession(authOptions);
    const user = session?.user;
    const role = user?.role ?? null;
    const branch = role !== "ADMIN" && user?.branchId
        ? await prisma.branch.findUnique({ where: { id: user.branchId }, select: { name: true } })
        : null;
    const branchLabel = role === "ADMIN" ? "Cross-branch access" : branch?.name ?? "Branch not assigned";

    return (
        <StaffAppShell
            role={role}
            name={user?.name ?? "Staff user"}
            branchLabel={branchLabel}
            navigation={getStaffNavigation(role)}
        >
            {children}
        </StaffAppShell>
    );
}