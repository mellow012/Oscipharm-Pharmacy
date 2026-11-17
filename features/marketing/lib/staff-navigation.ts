import type { Role } from "@prisma/client";
import { can, getImportAccess, getMembersAccess, type Permission } from "../../../lib/permissions.ts";

export type StaffNavigationItem = {
    href: string;
    label: string;
    permission: Permission;
};

export type StaffNavigation = {
    staff: StaffNavigationItem[];
    admin: StaffNavigationItem[];
    account: { href: string; label: string }[];
};

export type StaffNavigationGroup = {
    label: string;
    items: StaffNavigationItem[];
};

const NAVIGATION_GROUPS: Array<{ label: string; hrefs: string[] }> = [
    { label: "Workspace", hrefs: ["/staff"] },
    { label: "Operations", hrefs: ["/staff/sales", "/inventory", "/staff/catalog", "/staff/import"] },
    { label: "Members", hrefs: ["/staff/members"] },
    { label: "Insights", hrefs: ["/reports"] },
    { label: "Administration", hrefs: ["/admin", "/admin/staff", "/admin/memberships", "/staff/team"] },
    { label: "Communication", hrefs: ["/staff/news", "/staff/notifications"] },
];

const STAFF_ITEMS: StaffNavigationItem[] = [
    { href: "/staff", label: "Home", permission: "sales:view" },
    { href: "/staff/sales", label: "Sales", permission: "sales:view" },
    { href: "/inventory", label: "Inventory", permission: "inventory:view" },
    { href: "/staff/catalog", label: "Catalog", permission: "catalog:view" },
    { href: "/reports", label: "Reports", permission: "reports:branch:view" },
    { href: "/staff/news", label: "News and events", permission: "news:manage" },
    { href: "/staff/notifications", label: "Notifications", permission: "notifications:view" },
    { href: "/staff/members", label: "Members", permission: "members:view" },
];

const POS_ITEMS: StaffNavigationItem[] = [
    { href: "/staff", label: "Home", permission: "sales:view" },
    { href: "/staff/sales", label: "Sales", permission: "sales:view" },
    { href: "/inventory", label: "Inventory", permission: "inventory:view" },
    { href: "/staff/catalog", label: "Catalog", permission: "catalog:view" },
    { href: "/staff/members", label: "Members", permission: "members:view" },
    { href: "/staff/notifications", label: "Notifications", permission: "notifications:view" },
];

const ADMIN_ITEMS: StaffNavigationItem[] = [
    { href: "/admin", label: "Overview", permission: "users:manage" },
    { href: "/admin/staff", label: "Staff & Branches", permission: "users:manage" },
    { href: "/admin/memberships", label: "Memberships", permission: "membership:manage" },
    { href: "/staff/members", label: "Members", permission: "members:view" },
    { href: "/staff/news", label: "News and events", permission: "news:manage" },
    { href: "/staff/notifications", label: "Notifications", permission: "notifications:view" },
    { href: "/staff/team", label: "Team", permission: "reports:branch:view" },
];

const NAV_ROOT_HREFS = new Set([STAFF_ITEMS[0].href, ADMIN_ITEMS[0].href]);

export function shouldShowAdminNavigation(pathname: string): boolean {
    return pathname === "/admin"
        || pathname.startsWith("/admin/")
        || pathname === "/staff/team"
        || pathname.startsWith("/staff/team/");
}

export function isNavItemActive(href: string, pathname: string): boolean {
    if (NAV_ROOT_HREFS.has(href)) return pathname === href;
    if (href === "/admin/staff") {
        return pathname === href || pathname === "/admin/branches" || pathname.startsWith(`${href}/`) || pathname.startsWith("/admin/branches/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function getStaffNavigation(role: Role | null): StaffNavigation {
    if (!role) return { staff: [], admin: [], account: accountItems() };

    const allowed = (item: StaffNavigationItem) => can(role, item.permission);
    const memberAccess = getMembersAccess(role);
    const isAllowed = (item: StaffNavigationItem) => item.permission === "members:view" ? memberAccess.view : allowed(item);
    const importAccess = getImportAccess(role);
    const staff = (role === "POS" ? POS_ITEMS : STAFF_ITEMS).filter(isAllowed);
    if (importAccess.label) {
        const catalogIndex = staff.findIndex((item) => item.href === "/staff/catalog");
        staff.splice(catalogIndex < 0 ? staff.length : catalogIndex + 1, 0, {
            href: "/staff/import",
            label: importAccess.label,
            permission: importAccess.stock ? "stock:import" : "sales:import",
        });
    }

    return {
        staff,
        admin: ADMIN_ITEMS.filter((item) => {
            if (item.label === "Team") return role === "BRANCH_MANAGER";
            if (item.href === "/staff/members") return role !== "POS" && memberAccess.view;
            return isAllowed(item);
        }),
        account: accountItems(),
    };
}

function accountItems() {
    return [
        { href: "/", label: "Public site" },
        { href: "signout", label: "Sign out" },
    ];
}

export function groupStaffNavigation(items: StaffNavigationItem[]): StaffNavigationGroup[] {
    return NAVIGATION_GROUPS
        .map((group) => ({
            label: group.label,
            items: group.hrefs.flatMap((href) => items.filter((item) => item.href === href)),
        }))
        .filter((group) => group.items.length > 0);
}