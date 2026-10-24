"use client";

import Link from "next/link";
import type { Role } from "@prisma/client";
import { SalesFreshnessBanner } from "@/features/reports/components/SalesFreshnessBanner";
import type { SalesFreshness } from "@/features/reports/lib/sales-freshness";
import { getHomeTileGroups } from "@/features/home/lib/home-tiles";

type HomeDashboardProps = {
    name: string;
    role: Role;
    freshness: SalesFreshness;
};

export function HomeDashboard({ name, role, freshness }: HomeDashboardProps) {
    const groups = getHomeTileGroups(role);

    return (
        <div className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
            <div className="mt-5"><SalesFreshnessBanner freshness={freshness} /></div>
            <header className="mb-10 pt-8">
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                <h1 className="text-4xl text-ink">Good to see you, {name}</h1>
                <p className="mt-2 text-muted">Choose a workspace to continue.</p>
            </header>
            {groups.length === 0 ? <p className="text-sm text-muted">No workspaces are available for your account yet.</p> : (
                <div className="space-y-8">
                    {groups.map((group) => (
                        <section key={group.label} aria-labelledby={`home-group-${group.layout}`}>
                            <h2 id={`home-group-${group.layout}`} className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-warn">{group.label}</h2>
                            <div className={group.layout === "daily" ? "grid grid-cols-1 gap-3 md:grid-cols-2" : "grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3"}>
                                {group.tiles.map((tile) => (
                                    <Link
                                        key={tile.href}
                                        href={tile.href}
                                        className={`group flex min-h-11 items-center justify-between ${group.layout === "daily" ? "gap-3" : "gap-2"} border border-border border-l-4 bg-surface text-ink transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tile.accent} ${group.layout === "daily" ? "min-h-[88px] px-4 py-3 sm:px-5" : "min-h-14 px-3 py-3 sm:px-4"}`}
                                    >
                                        <span className="min-w-0">
                                            <span className={`block min-w-0 break-words hyphens-auto font-display leading-tight group-hover:text-primary ${group.layout === "daily" ? "text-xl" : "text-base sm:text-lg"}`}>{tile.label}</span>
                                            {group.layout === "daily" ? <span className="mt-1 block text-sm text-muted">{tile.description}</span> : null}
                                        </span>
                                        <span aria-hidden="true" className="shrink-0 text-lg text-primary transition-transform group-hover:translate-x-1">-&gt;</span>
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
