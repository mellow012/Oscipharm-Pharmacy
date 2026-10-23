import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { listTeamForManager } from "@/features/admin/lib/staff-service";
import { roleLabel } from "@/features/admin/lib/staff-rules";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffTeamPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) redirect("/login");
    if (session.user.role === "ADMIN") redirect("/admin/staff");
    if (session.user.role !== "BRANCH_MANAGER") redirect("/unauthorized");

    const result = await listTeamForManager(session.user.id);
    if (!result.ok) redirect("/unauthorized");

    return (
        <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8 sm:px-8">
            <StaffHeader />
            <header className="mb-6 border-b border-border pb-6">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-warn">Staff workspace</p>
                <h1 className="mt-2 text-3xl text-ink">Team</h1>
            </header>
            <div className="divide-y divide-border border-y border-border">
                {result.users.map((user) => (
                    <div key={user.id} className={`flex flex-wrap items-center justify-between gap-3 py-4 ${user.isActive ? "" : "opacity-50"}`}>
                        <div className="min-w-0">
                            <p className="truncate text-base text-ink">{user.name}</p>
                            <p className="truncate text-sm text-muted">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {!user.isActive ? <span className="border border-border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted">Inactive</span> : null}
                            <span className="font-mono text-xs uppercase tracking-[0.1em] text-primary">{roleLabel(user.role)}</span>
                        </div>
                    </div>
                ))}
                {!result.users.length ? <p className="py-8 text-sm text-muted">No staff accounts found.</p> : null}
            </div>
        </main>
    );
}