import type { Role } from "@prisma/client";
import { can, type Permission } from "../../../lib/permissions.ts";

export type HomeTile = {
    label: string;
    description: string;
    href: string;
    permission: Permission | null;
    accent: "border-primary" | "border-warn";
};

export type HomeTileGroup = {
    label: "Daily work" | "More";
    layout: "daily" | "more";
    tiles: HomeTile[];
};

const DAILY_TILES: HomeTile[] = [
    { label: "Sales", description: "Browse sales and refunds", href: "/staff/sales", permission: "sales:view", accent: "border-primary" },
    { label: "Inventory", description: "Receive stock and manage batches", href: "/inventory", permission: "inventory:view", accent: "border-warn" },
];

const MORE_TILES: HomeTile[] = [
    { label: "Catalog", description: "Review products and Aronium codes", href: "/staff/catalog", permission: "catalog:view", accent: "border-primary" },
    { label: "Reports", description: "Review branch sales and audit history", href: "/reports", permission: "reports:branch:view", accent: "border-warn" },
    { label: "Stock import", description: "Preview and import an Aronium Stock workbook", href: "/staff/import", permission: "stock:import", accent: "border-primary" },
    { label: "News and events", description: "Create and manage public updates", href: "/staff/news", permission: "news:manage", accent: "border-primary" },
    { label: "Memberships", description: "Review membership requests and set discounts", href: "/admin/memberships", permission: "membership:manage", accent: "border-warn" },
    { label: "Administration", description: "Manage users and branches", href: "/admin", permission: "users:manage", accent: "border-primary" },
];

export function getHomeTileGroups(role: Role): HomeTileGroup[] {
    const daily = DAILY_TILES.filter((tile) => tile.permission !== null && can(role, tile.permission));
    const more = MORE_TILES.filter((tile) => tile.permission !== null && can(role, tile.permission));

    if (role === "ADMIN") {
        more.push({ label: "Staff", description: "Manage staff accounts", href: "/admin/staff", permission: null, accent: "border-primary" });
    }
    if (role === "BRANCH_MANAGER") {
        more.push({ label: "Team", description: "View staff assigned to your branch", href: "/staff/team", permission: null, accent: "border-warn" });
    }

    const groups: HomeTileGroup[] = [
        { label: "Daily work", layout: "daily", tiles: daily },
        { label: "More", layout: "more", tiles: more },
    ];
    return groups.filter((group) => group.tiles.length > 0);
}