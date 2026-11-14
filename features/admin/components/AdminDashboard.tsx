import type { Role } from "@prisma/client";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageHeader } from "@/features/shared/components/PageHeader";
import { StatCard } from "@/features/shared/components/StatCard";
import { StatusBadge } from "@/features/shared/components/StatusBadge";
import {
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/features/shared/components/TableFrame";

type AdminDashboardProps = {
  name: string;
  data: Awaited<ReturnType<typeof import("@/features/admin/lib/queries").getAdminDashboardData>>;
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  BRANCH_MANAGER: "Branch manager",
  POS: "Sales",
};

const staffActionClass =
  "inline-flex min-h-11 items-center gap-space-sm border border-primary px-space-md font-label-md text-label-md text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function AdminDashboard({ name, data }: AdminDashboardProps) {
  const metrics = [
    { label: "Staff accounts", value: data.stats.userCount },
    { label: "Branches", value: data.stats.branchCount },
    { label: "Products", value: data.stats.variantCount },
    { label: "Stock batches", value: data.stats.batchCount },
  ];

  const branchHeader: ReactNode = (
    <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
      <h2 className="font-headline-md text-headline-md text-primary">Branch coverage</h2>
      <span className="font-table-header text-table-header tabular-nums text-on-surface-variant">
        {data.branches.length.toString().padStart(2, "0")} branches
      </span>
    </div>
  );

  const staffHeader: ReactNode = (
    <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
      <h2 className="font-headline-md text-headline-md text-primary">Staff directory</h2>
      <span className="font-table-header text-table-header uppercase text-on-surface-variant">
        Latest accounts
      </span>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen w-full min-w-0 max-w-[1440px] space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <PageHeader
        eyebrow="Admin workspace"
        title={`Good to see you, ${name}.`}
        description="A clear view of staff, branches, and the current pharmacy operation."
        actions={
          <>
            <Link href="/admin/staff" className={staffActionClass}>
              Manage staff <span aria-hidden="true">-&gt;</span>
            </Link>
            <Link href="/admin/memberships" className={staffActionClass}>
              Membership applications <span aria-hidden="true">-&gt;</span>
            </Link>
          </>
        }
      />

      <section
        aria-label="Pharmacy totals"
        className="grid min-w-0 grid-cols-1 gap-px border border-outline-variant bg-outline-variant sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} />
        ))}
      </section>

      <section className="grid min-w-0 gap-space-lg py-space-md">
        <TableFrame
          ariaLabel="Branch coverage"
          tableClassName="min-w-[560px]"
          header={branchHeader}
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Branch</TableHeaderCell>
              <TableHeaderCell>Location</TableHeaderCell>
              <TableHeaderCell align="right">Staff</TableHeaderCell>
              <TableHeaderCell align="right">Batches</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.branches.map((branch) => (
              <TableRow key={branch.id}>
                <TableCell className="min-w-40 font-label-md text-label-md text-on-surface">
                  {branch.name}
                </TableCell>
                <TableCell>{branch.location ?? "Location not set"}</TableCell>
                <TableCell numeric nowrap>
                  {branch._count.users}
                </TableCell>
                <TableCell numeric nowrap>
                  {branch._count.batches}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>

        <TableFrame
          ariaLabel="Staff directory, latest accounts"
          tableClassName="min-w-[660px]"
          header={staffHeader}
        >
          <TableHead>
            <tr>
              <TableHeaderCell>Staff</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Branch</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {data.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="min-w-52">
                  <p className="font-label-md text-label-md text-on-surface">{user.name}</p>
                  <p className="mt-space-xs break-all text-on-surface-variant">{user.email}</p>
                </TableCell>
                <TableCell nowrap>
                  <div className="flex items-center gap-space-sm">
                    {!user.isActive ? <StatusBadge tone="neutral">Inactive</StatusBadge> : null}
                    <span className="font-label-sm text-label-sm text-primary">
                      {roleLabels[user.role]}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{user.branch?.name ?? "Cross-branch access"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </section>
    </div>
  );
}
