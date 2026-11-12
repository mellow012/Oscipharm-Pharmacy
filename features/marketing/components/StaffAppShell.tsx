"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import { getStaffNavigation, isNavItemActive, shouldShowAdminNavigation } from "@/features/marketing/lib/staff-navigation";

export function StaffAppShell({ role, children }: { role: Role | null; children: React.ReactNode }) {
    const pathname = usePathname();
    const navigation = getStaffNavigation(role);
    const showAdminTabs = shouldShowAdminNavigation(pathname);
    const items = showAdminTabs ? navigation.admin : navigation.staff;

    return (
        <>
            <header className="border-b border-border bg-surface">
                <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-3 sm:gap-6 sm:px-6 lg:px-8">
                    <Link href="/staff" className="shrink-0 rounded-sm px-2 py-3 font-display text-lg text-ink outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:text-xl">
                        OsciPharm
                    </Link>
                    <nav aria-label={showAdminTabs ? "Admin navigation" : "Staff navigation"} className="min-w-0 flex-1 overflow-x-auto">
                        <ul className="flex min-w-max items-stretch gap-1">
                            {items.map((item) => {
                                const active = isNavItemActive(item.href, pathname);
                                return (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            aria-current={active ? "page" : undefined}
                                            className={`flex min-h-11 items-center border-b-2 px-3 text-sm outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? "border-primary font-semibold text-primary" : "border-transparent text-muted hover:text-primary"}`}
                                        >
                                            {item.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                    <details className="group relative shrink-0">
                        <summary aria-label="Account menu" className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-sm border border-border px-3 text-sm text-ink outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                            <span className="hidden sm:inline">Account</span>
                            <span className="sm:hidden" aria-hidden="true">⋯</span>
                        </summary>
                        <div className="absolute right-0 z-50 mt-2 min-w-40 border border-border bg-surface p-1 shadow-lg">
                            {navigation.account.map((item) => item.href === "signout" ? (
                                <button
                                    key={item.href}
                                    type="button"
                                    onClick={() => signOut({ callbackUrl: "/" })}
                                    className="flex min-h-11 w-full items-center rounded-sm px-3 text-left text-sm text-ink outline-offset-[-2px] hover:bg-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                                >
                                    {item.label}
                                </button>
                            ) : (
                                <Link key={item.href} href={item.href} className="flex min-h-11 items-center rounded-sm px-3 text-sm text-ink outline-offset-[-2px] hover:bg-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </details>
                </div>
            </header>
            <main>{children}</main>
        </>
    );
}