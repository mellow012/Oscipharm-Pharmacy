import Link from "next/link";
import type { Role } from "@prisma/client";
import { SalesFreshnessBanner } from "@/features/reports/components/SalesFreshnessBanner";
import type { SalesFreshness } from "@/features/reports/lib/sales-freshness";
import { getHomeTileGroups } from "@/features/home/lib/home-tiles";
import { PageHeader } from "@/features/shared/components/PageHeader";

type HomeDashboardProps = {
  name: string;
  role: Role;
  freshness: SalesFreshness;
};

export function HomeDashboard({ name, role, freshness }: HomeDashboardProps) {
  const groups = getHomeTileGroups(role);

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl min-w-0 space-y-space-lg px-gutter-mobile py-space-lg sm:px-6 sm:py-space-xl">
      <SalesFreshnessBanner freshness={freshness} />
      <PageHeader
        eyebrow="OsciPharm staff"
        title={`Good to see you, ${name}`}
        description="Choose a workspace to continue."
        className="border-b-0 pb-0"
      />

      {groups.length === 0 ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          No workspaces are available for your account yet.
        </p>
      ) : (
        <div className="space-y-space-xl">
          {groups.map((group) => (
            <section key={group.label} aria-labelledby={`home-group-${group.layout}`}>
              <h2
                id={`home-group-${group.layout}`}
                className="mb-space-md border-b border-outline-variant pb-space-sm font-eyebrow text-eyebrow uppercase text-secondary"
              >
                {group.label}
              </h2>
              <div
                className={
                  group.layout === "daily"
                    ? "grid min-w-0 grid-cols-1 gap-space-md md:grid-cols-2"
                    : "grid min-w-0 grid-cols-1 gap-space-sm sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {group.tiles.map((tile) => (
                  <Link
                    key={tile.href}
                    href={tile.href}
                    className={`group flex min-h-11 min-w-0 items-center justify-between gap-space-md border border-outline-variant border-l-2 bg-surface-container-lowest px-space-md py-space-md text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tile.accent}`}
                  >
                    <span className="min-w-0">
                      <span className="block break-words font-headline-sm text-headline-sm text-primary">
                        {tile.label}
                      </span>
                      {group.layout === "daily" ? (
                        <span className="mt-space-xs block font-body-sm text-body-sm text-on-surface-variant">
                          {tile.description}
                        </span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 font-label-md text-label-md text-primary transition-transform group-hover:translate-x-1"
                    >
                      -&gt;
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
