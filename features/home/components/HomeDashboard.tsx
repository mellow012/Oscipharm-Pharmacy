"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { can } from "@/lib/permissions";

const sections = [
    { label: "Catalog", description: "Browse medicines and products", href: "/catalog", permission: null, accent: "border-primary" },
    { label: "Inventory", description: "Receive stock and manage batches", href: "/inventory", permission: "stock:receive" as const, accent: "border-warn" },
    { label: "Point of Sale", description: "Complete and review branch sales", href: "/pos", permission: "pos:checkout" as const, accent: "border-primary" },
    { label: "Reports", description: "Review branch sales and audit history", href: "/reports", permission: "reports:branch:view" as const, accent: "border-warn" },
    { label: "Admin", description: "Manage users and branches", href: "/admin", permission: "users:manage" as const, accent: "border-primary" },
];

type HomeDashboardProps = {
    name: string;
    role: Role;
};

export function HomeDashboard({ name, role }: HomeDashboardProps) {
    const accessibleSections = sections.filter(
        (section) => section.permission === null || can(role, section.permission)
    );

    return (
        <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-12">
            <header className="mb-10 flex items-start justify-between gap-6 border-b border-border pb-8">
                <div>
                    <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-warn">OsciPharm staff</p>
                    <h1 className="text-4xl text-ink">Good to see you, {name}</h1>
                    <p className="mt-2 text-muted">Choose a workspace to continue.</p>
                </div>
                <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="border border-border px-3 py-2 text-sm text-muted transition hover:border-primary hover:text-primary"
                >
                    Sign out
                </button>
            </header>
            <div className="border-y border-border">
                {accessibleSections.map((section) => (
                    <Link
                        key={section.label}
                        href={section.href}
                        className={`group flex items-center justify-between gap-6 border-b border-border border-l-4 bg-surface px-5 py-5 transition last:border-b-0 hover:bg-white ${section.accent}`}
                    >
                        <div>
                            <h2 className="text-xl text-ink group-hover:text-primary">{section.label}</h2>
                            <p className="mt-1 text-sm text-muted">{section.description}</p>
                        </div>
                        <span aria-hidden="true" className="text-xl text-warn transition-transform group-hover:translate-x-1">-&gt;</span>
                    </Link>
                ))}
            </div>
        </main>
    );
}
