"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@prisma/client";
import {
    BookOpen,
    Building2,
    Boxes,
    ChartColumn,
    ExternalLink,
    HeartHandshake,
    Home,
    LayoutDashboard,
    LogOut,
    MapPin,
    Menu,
    Newspaper,
    ReceiptText,
    Upload,
    UsersRound,
    X,
    type LucideIcon,
} from "lucide-react";
import { PendingLink } from "@/features/marketing/components/PendingLink";
import {
    groupStaffNavigation,
    isNavItemActive,
    shouldShowAdminNavigation,
    type StaffNavigation,
} from "@/features/marketing/lib/staff-navigation";

const roleLabels: Record<Role, string> = {
    ADMIN: "Administrator",
    BRANCH_MANAGER: "Branch manager",
    POS: "Point of sale",
};

const navIcons: Record<string, LucideIcon> = {
    Home,
    Sales: ReceiptText,
    Inventory: Boxes,
    Catalog: BookOpen,
    Reports: ChartColumn,
    "News and events": Newspaper,
    Import: Upload,
    "Import sales": Upload,
    Overview: LayoutDashboard,
    Staff: UsersRound,
    Branches: Building2,
    Memberships: HeartHandshake,
    Members: UsersRound,
    Team: UsersRound,
};

type StaffAppShellProps = {
    role: Role | null;
    name: string;
    branchLabel: string;
    navigation: StaffNavigation;
    children: React.ReactNode;
};

export function StaffAppShell({ role, name, branchLabel, navigation, children }: StaffAppShellProps) {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const sidebarRef = useRef<HTMLElement>(null);
    const showAdminNavigation = shouldShowAdminNavigation(pathname);
    const items = showAdminNavigation ? navigation.admin : navigation.staff;
    const groups = groupStaffNavigation(items);
    const titleItems = [...navigation.staff, ...navigation.admin];
    const currentItem = titleItems
        .filter((item) => isNavItemActive(item.href, pathname))
        .sort((left, right) => right.href.length - left.href.length)[0];
    const sectionTitle = currentItem?.label ?? (pathname === "/staff/import" ? "Import" : "Workspace");
    const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 1200px)");
        const updateViewport = () => {
            setIsDesktop(mediaQuery.matches);
            if (mediaQuery.matches) setDrawerOpen(false);
        };
        updateViewport();
        mediaQuery.addEventListener("change", updateViewport);
        return () => mediaQuery.removeEventListener("change", updateViewport);
    }, []);

    useEffect(() => {
        if (!drawerOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        closeButtonRef.current?.focus();

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                event.preventDefault();
                setDrawerOpen(false);
                menuButtonRef.current?.focus();
                return;
            }
            if (event.key !== "Tab" || !sidebarRef.current) return;

            const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
            )).filter((element) => element.offsetParent !== null);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first || !last) return;

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [drawerOpen]);

    function closeDrawer() {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
    }

    return (
        <div className="min-h-screen bg-surface text-on-surface">
            <a href="#main-content" className="fixed left-4 top-4 z-[70] -translate-y-20 rounded bg-primary px-4 py-3 text-on-primary focus:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                Skip to content
            </a>

            {drawerOpen ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    tabIndex={-1}
                    onClick={closeDrawer}
                    className="fixed inset-0 z-40 bg-on-surface/35 min-[1200px]:hidden"
                />
            ) : null}

            <aside
                ref={sidebarRef}
                id="staff-sidebar"
                aria-label="Staff workspace"
                aria-hidden={!isDesktop && !drawerOpen ? true : undefined}
                inert={!isDesktop && !drawerOpen}
                className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[calc(100vw-2rem)] flex-col border-r border-outline-variant bg-surface-container-lowest transition-transform duration-200 motion-reduce:transition-none ${drawerOpen ? "translate-x-0" : "-translate-x-full min-[1200px]:translate-x-0"}`}
            >
                <div className="flex min-h-24 items-start justify-between border-b border-outline-variant px-5 py-5">
                    <div className="min-w-0">
                        <PendingLink href="/staff" onClick={() => drawerOpen && closeDrawer()} className="block font-display text-2xl leading-tight text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                            OsciPharm
                        </PendingLink>
                        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Good Chemistry. Good Health.</p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        aria-label="Close navigation"
                        onClick={closeDrawer}
                        className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container min-[1200px]:hidden"
                    >
                        <X aria-hidden="true" size={19} />
                    </button>
                </div>

                <div className="px-4 py-4">
                    <div className="flex min-h-11 items-center gap-2 rounded bg-surface-container-low px-3 text-sm text-on-surface-variant" title={branchLabel}>
                        <MapPin aria-hidden="true" size={16} className="shrink-0 text-secondary" />
                        <span className="truncate">{branchLabel}</span>
                    </div>
                </div>

                <nav aria-label={showAdminNavigation ? "Administration navigation" : "Staff navigation"} className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                    {groups.map((group) => (
                        <section key={group.label} className="mb-5 last:mb-0">
                            <h2 className="px-3 pb-2 font-eyebrow text-eyebrow uppercase tracking-[0.12em] text-outline">{group.label}</h2>
                            <ul className="space-y-1">
                                {group.items.map((item) => {
                                    const active = isNavItemActive(item.href, pathname);
                                    const Icon = navIcons[item.label] ?? LayoutDashboard;
                                    return (
                                        <li key={item.href}>
                                            <PendingLink
                                                href={item.href}
                                                aria-current={active ? "page" : undefined}
                                                onClick={() => drawerOpen && closeDrawer()}
                                                className={`flex min-h-11 items-center gap-3 rounded px-3 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? "bg-primary font-semibold text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"}`}
                                            >
                                                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                                                <span>{item.label}</span>
                                            </PendingLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </nav>

                <div className="border-t border-outline-variant p-4">
                    <div className="flex items-center gap-3 px-1 pb-3">
                        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed font-label-md text-label-md font-semibold text-on-primary-fixed-variant">{initials || "S"}</span>
                        <div className="min-w-0">
                            <p className="truncate font-label-md text-label-md text-on-surface">{name}</p>
                            <p className="font-body-sm text-body-sm text-on-surface-variant">{role ? roleLabels[role] : "Staff"}</p>
                        </div>
                    </div>
                    {navigation.account.map((item) => item.href === "signout" ? (
                        <button
                            key={item.href}
                            type="button"
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex min-h-11 w-full items-center gap-3 rounded px-3 text-left text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <LogOut aria-hidden="true" size={18} />
                            {item.label}
                        </button>
                    ) : (
                        <PendingLink
                            key={item.href}
                            href={item.href}
                            onClick={() => drawerOpen && closeDrawer()}
                            className="flex min-h-11 items-center gap-3 rounded px-3 text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            <ExternalLink aria-hidden="true" size={18} />
                            {item.label}
                        </PendingLink>
                    ))}
                </div>
            </aside>

            <div className="min-h-screen min-[1200px]:pl-72">
                <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-outline-variant bg-surface/95 px-4 backdrop-blur-sm sm:px-6">
                    <button
                        ref={menuButtonRef}
                        type="button"
                        aria-label="Open navigation"
                        aria-controls="staff-sidebar"
                        aria-expanded={drawerOpen}
                        onClick={() => setDrawerOpen(true)}
                        className="flex size-11 shrink-0 items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container min-[1200px]:hidden"
                    >
                        <Menu aria-hidden="true" size={19} />
                    </button>
                    <div className="min-w-0">
                        <p className="font-eyebrow text-eyebrow uppercase tracking-[0.12em] text-outline">OsciPharm workspace</p>
                        <p className="truncate font-headline-sm text-headline-sm text-primary">{sectionTitle}</p>
                    </div>
                </header>
                <main id="main-content" tabIndex={-1} className="min-h-[calc(100vh-4rem)] bg-surface focus:outline-none">
                    <div className="mx-auto w-full max-w-[1440px] px-gutter-mobile min-[768px]:px-6 min-[1200px]:px-gutter">{children}</div>
                </main>
            </div>
        </div>
    );
}