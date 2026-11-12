import type { Role } from "@prisma/client";
import { can, type Permission } from "../../../lib/permissions.ts";

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

const STAFF_ITEMS: StaffNavigationItem[] = [
    { href: "/staff", label: "Home", permission: "sales:view" },
    { href: "/staff/sales", label: "Sales", permission: "sales:view" },
    { href: "/inventory", label: "Inventory", permission: "inventory:view" },
    { href: "/staff/catalog", label: "Catalog", permission: "catalog:view" },
    { href: "/reports", label: "Reports", permission: "reports:branch:view" },
    { href: "/staff/news", label: "News and events", permission: "news:manage" },
];

const POS_ITEMS: StaffNavigationItem[] = [
    { href: "/staff", label: "Home", permission: "sales:view" },
    { href: "/staff/sales", label: "Sales", permission: "sales:view" },
    { href: "/inventory", label: "Inventory", permission: "inventory:view" },
    { href: "/staff/catalog", label: "Catalog", permission: "catalog:view" },
    { href: "/staff/import", label: "Stock import", permission: "stock:import" },
];

const ADMIN_ITEMS: StaffNavigationItem[] = [
    { href: "/admin", label: "Overview", permission: "users:manage" },
    { href: "/admin/staff", label: "Staff", permission: "users:manage" },
    { href: "/admin/memberships", label: "Memberships", permission: "membership:manage" },
    { href: "/staff/news", label: "News and events", permission: "news:manage" },
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
    return pathname === href || pathname.startsWith(`${href}/`);
}

export function getStaffNavigation(role: Role | null): StaffNavigation {
    if (!role) return { staff: [], admin: [], account: accountItems() };

    const allowed = (item: StaffNavigationItem) => can(role, item.permission);
    return {
        staff: (role === "POS" ? POS_ITEMS : STAFF_ITEMS).filter(allowed),
        admin: ADMIN_ITEMS.filter((item) => {
            if (item.label === "Team") return role === "BRANCH_MANAGER";
            return allowed(item);
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