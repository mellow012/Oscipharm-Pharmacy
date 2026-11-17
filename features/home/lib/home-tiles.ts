import type { Role } from "@prisma/client";
import { can, getImportAccess, getMembersAccess, type Permission } from "../../../lib/permissions.ts";

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
    { label: "Import", description: "", href: "/staff/import", permission: null, accent: "border-primary" },
    { label: "News and events", description: "Create and manage public updates", href: "/staff/news", permission: "news:manage", accent: "border-primary" },
    { label: "Notifications", description: "Review recent activity and items needing attention", href: "/staff/notifications", permission: "notifications:view", accent: "border-warn" },
    { label: "Memberships", description: "Review membership requests and set discounts", href: "/admin/memberships", permission: "membership:manage", accent: "border-warn" },
    { label: "Members", description: "Search member details for dispensing", href: "/staff/members", permission: "members:view", accent: "border-warn" },
    { label: "Administration", description: "Review staff, branch coverage, and pharmacy totals", href: "/admin", permission: "users:manage", accent: "border-primary" },
];

export function getHomeTileGroups(role: Role): HomeTileGroup[] {
    const daily = DAILY_TILES.filter((tile) => tile.permission !== null && can(role, tile.permission));
    const importAccess = getImportAccess(role);
    const membersAccess = getMembersAccess(role);
    const more = MORE_TILES.flatMap((tile) => {
        if (tile.href === "/staff/import") {
            if (!importAccess.label) return [];
            return [{
                ...tile,
                label: importAccess.label,
                description: importAccess.stock
                    ? "Preview and import Aronium Stock and Sales Item workbooks"
                    : "Preview and import an Aronium Sales Item workbook",
            }];
        }
        if (tile.permission === "members:view") return membersAccess.view ? [tile] : [];
        return tile.permission !== null && can(role, tile.permission) ? [tile] : [];
    });

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