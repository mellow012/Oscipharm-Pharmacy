import { getServerSession } from "next-auth";
import { StaffAppShell } from "@/features/marketing/components/StaffAppShell";
import { authOptions } from "@/lib/auth";

export default async function StaffAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const session = await getServerSession(authOptions);
    return <StaffAppShell role={session?.user?.role ?? null}>{children}</StaffAppShell>;
}