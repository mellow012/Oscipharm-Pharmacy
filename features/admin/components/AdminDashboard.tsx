import type { Role } from "@prisma/client";
import Link from "next/link";
import { StaffHeader } from "@/features/marketing/components/StaffHeader";

type AdminDashboardProps = {
    name: string;
    data: Awaited<ReturnType<typeof import("@/features/admin/lib/queries").getAdminDashboardData>>;
};

const roleLabels: Record<Role, string> = {
    ADMIN: "Admin",
    BRANCH_MANAGER: "Branch manager",
    POS: "POS",
};

export function AdminDashboard({ name, data }: AdminDashboardProps) {
    const metrics = [
        { label: "Staff accounts", value: data.stats.userCount },
        { label: "Branches", value: data.stats.branchCount },
        { label: "Products", value: data.stats.variantCount },
        { label: "Stock batches", value: data.stats.batchCount },
    ];

    return (
        <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-6 sm:px-8 sm:py-8">
            <StaffHeader />

            <header className="flex flex-col gap-4 border-b border-border py-10 sm:flex-row sm:items-end sm:justify-between sm:py-14">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">Admin workspace</p>
                    <h1 className="text-5xl leading-[0.98] text-ink">Good to see you, {name}.</h1>
                    <p className="mt-3 max-w-xl text-lg text-muted">A clear view of staff, branches, and the current pharmacy operation.</p>
                </div>
                <Link href="/admin/memberships" className="inline-flex w-fit items-center gap-2 border border-primary px-4 py-3 font-semibold text-primary transition hover:bg-chip">
                    Membership applications <span aria-hidden="true">-&gt;</span>
                </Link>
            </header>

            <section aria-label="Pharmacy totals" className="grid border-b border-border sm:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric) => (
                    <div key={metric.label} className="border-b border-border px-5 py-6 sm:border-r lg:border-b-0 last:border-r-0">
                        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{metric.label}</p>
                        <p className="mt-2 text-4xl text-ink">{metric.value}</p>
                    </div>
                ))}
            </section>

            <div className="grid gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
                <section>
                    <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
                        <h2 className="text-2xl text-ink">Branch coverage</h2>
                        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{data.branches.length.toString().padStart(2, "0")} branches</span>
                    </div>
                    <div className="divide-y divide-border border-y border-border">
                        {data.branches.map((branch) => (
                            <div key={branch.id} className="flex items-center justify-between gap-4 py-5">
                                <div>
                                    <h3 className="text-xl text-ink">{branch.name}</h3>
                                    <p className="mt-1 text-sm text-muted">{branch.location ?? "Location not set"}</p>
                                </div>
                                <div className="text-right font-mono text-xs uppercase tracking-[0.1em] text-muted">
                                    <p>{branch._count.users} staff</p>
                                    <p className="mt-1">{branch._count.batches} batches</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
                        <h2 className="text-2xl text-ink">Staff directory</h2>
                        <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Latest accounts</span>
                    </div>
                    <div className="divide-y divide-border border-y border-border">
                        {data.users.map((user) => (
                            <div key={user.id} className="py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <h3 className="truncate text-lg text-ink">{user.name}</h3>
                                        <p className="truncate text-sm text-muted">{user.email}</p>
                                    </div>
                                    <span className="shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-primary">{roleLabels[user.role]}</span>
                                </div>
                                <p className="mt-2 text-xs text-muted">{user.branch?.name ?? "Cross-branch access"}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}