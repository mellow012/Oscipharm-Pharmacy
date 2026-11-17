import { formatBlantyreDay, getMalawiDateKey } from "../../../lib/timezone.ts";

export type NotificationRole = "ADMIN" | "BRANCH_MANAGER" | "POS";
export type NotificationKind = "membership" | "expiry" | "low-stock" | "shortfall" | "stale" | "missing-stock" | "import" | "news" | "member" | "staff" | "branch";

export type NotificationItem = {
    id: string;
    kind: NotificationKind;
    tone: "attention" | "info";
    title: string;
    description: string;
    href: string;
    occurredAt: Date | null;
    branchName?: string;
};

export type NotificationSources = {
    now?: Date;
    branches: Array<{ id: string; name: string; latestStockImportAt: Date | null; latestImportAt: Date | null }>;
    pendingMembershipCount: number;
    batchExpiries: Array<{ branchId: string; expiryDate: Date; expiryDateKnown: boolean }>;
    stockLevels: Array<{ branchId: string; variantId: string; quantityRemaining: number; expiryDate: Date; expiryDateKnown: boolean }>;
    reorderPoints: Array<{ branchId: string; variantId: string; reorderThreshold: number }>;
    shortfalls: Array<{ branchId: string; units: number }>;
    imports: Array<{ id: string; branchId: string; branchName: string; actorName: string; kind: "STOCK" | "SALES"; committedAt: Date; rowsOrReceipts: number | null; shortfallUnits: number }>;
    news: Array<{ id: string; title: string; authorName: string; occurredAt: Date }>;
    members: Array<{ id: string; name: string; occurredAt: Date }>;
    staffEvents: Array<{ id: string; branchId: string | null; branchName: string | null; actorName: string; title: string; occurredAt: Date }>;
    branchEvents: Array<{ id: string; branchName: string; actorName: string; title: string; occurredAt: Date }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_MS = 14 * DAY_MS;
const IMPORT_STALE_MS = 48 * 60 * 60 * 1000;
const EXPIRY_WINDOW_MS = 30 * DAY_MS;

function malawiDayNumber(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Blantyre",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date).reduce<Record<string, number>>((result, part) => {
        if (part.type !== "literal") result[part.type] = Number(part.value);
        return result;
    }, {});
    return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function branchAllowed(role: NotificationRole, branchId: string | null, itemBranchId: string) {
    return role === "ADMIN" || Boolean(branchId && branchId === itemBranchId);
}

function eventIsRecent(occurredAt: Date, now: Date) {
    const time = occurredAt.getTime();
    return Number.isFinite(time) && time <= now.getTime() && now.getTime() - time <= RECENT_WINDOW_MS;
}

function byNewest(left: NotificationItem, right: NotificationItem) {
    return (right.occurredAt?.getTime() ?? 0) - (left.occurredAt?.getTime() ?? 0);
}

export function buildNotifications(role: NotificationRole, branchId: string | null, sources: NotificationSources) {
    const now = sources.now ?? new Date();
    const attention: NotificationItem[] = [];
    const activity: NotificationItem[] = [];
    const scopedBranches = sources.branches.filter((branch) => branchAllowed(role, branchId, branch.id));

    if ((role === "ADMIN" || role === "BRANCH_MANAGER") && sources.pendingMembershipCount > 0) {
        attention.push({
            id: "pending-memberships",
            kind: "membership",
            tone: "attention",
            title: "Membership applications pending",
            description: `${sources.pendingMembershipCount} application${sources.pendingMembershipCount === 1 ? " is" : "s are"} awaiting review.`,
            href: "/admin/memberships",
            occurredAt: null,
        });
    }

    if (role !== "POS") {
        for (const branch of scopedBranches) {
            const today = malawiDayNumber(now);
            const expiringCount = sources.batchExpiries.filter((batch) => {
                if (batch.branchId !== branch.id || !batch.expiryDateKnown) return false;
                const expiry = malawiDayNumber(batch.expiryDate);
                return Number.isFinite(expiry) && expiry <= today + EXPIRY_WINDOW_MS;
            }).length;
            if (expiringCount > 0) {
                attention.push({
                    id: `expiry:${branch.id}`,
                    kind: "expiry",
                    tone: "attention",
                    title: "Stock expiry needs review",
                    description: `${expiringCount} batch${expiringCount === 1 ? " is" : "es are"} expired or expiring within 30 days.`,
                    href: "/inventory?tab=expiry",
                    occurredAt: null,
                    branchName: branch.name,
                });
            }

            const reorderPoints = sources.reorderPoints.filter((item) => item.branchId === branch.id);
            const lowStockCount = reorderPoints.filter((point) => {
                const remaining = sources.stockLevels
                    .filter((stock) => stock.branchId === branch.id
                        && stock.variantId === point.variantId
                        && (!stock.expiryDateKnown || malawiDayNumber(stock.expiryDate) >= today))
                    .reduce((sum, stock) => sum + stock.quantityRemaining, 0);
                return remaining <= point.reorderThreshold;
            }).length;
            if (lowStockCount > 0) {
                attention.push({
                    id: `low-stock:${branch.id}`,
                    kind: "low-stock",
                    tone: "attention",
                    title: "Low stock",
                    description: `${lowStockCount} item${lowStockCount === 1 ? " is" : "s are"} at or below its reorder point.`,
                    href: "/inventory",
                    occurredAt: null,
                    branchName: branch.name,
                });
            }
        }
    }

    for (const branch of scopedBranches) {
        const shortfallUnits = sources.shortfalls.find((item) => item.branchId === branch.id)?.units ?? 0;
        if (shortfallUnits > 0) {
            attention.push({
                id: `shortfall:${branch.id}`,
                kind: "shortfall",
                tone: "attention",
                title: "Sales import shortfall",
                description: `${shortfallUnits} unit${shortfallUnits === 1 ? " is" : "s are"} not allocated to stock in the latest sales import.`,
                href: "/staff/import",
                occurredAt: null,
                branchName: branch.name,
            });
        }

        const latestImport = branch.latestImportAt?.getTime();
        if (latestImport !== undefined && Number.isFinite(latestImport) && now.getTime() - latestImport > IMPORT_STALE_MS) {
            attention.push({
                id: `stale:${branch.id}`,
                kind: "stale",
                tone: "attention",
                title: "Import data is over 48 hours old",
                description: "No stock or sales import has been committed in more than 48 hours.",
                href: "/staff/import",
                occurredAt: null,
                branchName: branch.name,
            });
        }

        if (!branch.latestStockImportAt) {
            attention.push({
                id: `missing-stock:${branch.id}`,
                kind: "missing-stock",
                tone: "attention",
                title: "No committed stock import",
                description: "This branch has no committed stock import.",
                href: "/staff/import",
                occurredAt: null,
                branchName: branch.name,
            });
        }
    }

    for (const item of sources.imports) {
        if (!branchAllowed(role, branchId, item.branchId) || !eventIsRecent(item.committedAt, now)) continue;
        const volume = item.rowsOrReceipts === null
            ? "Import committed"
            : `${item.kind === "SALES" ? `${item.rowsOrReceipts} receipts` : `${item.rowsOrReceipts} rows`} imported`;
        const shortfall = item.kind === "SALES" ? `, ${item.shortfallUnits} unallocated units` : "";
        activity.push({
            id: `import:${item.id}`,
            kind: "import",
            tone: "info",
            title: `${item.kind === "SALES" ? "Sales" : "Stock"} import committed`,
            description: `${volume}${shortfall} by ${item.actorName}.`,
            href: "/staff/import",
            occurredAt: item.committedAt,
            branchName: item.branchName,
        });
    }

    for (const item of sources.news) {
        if (!eventIsRecent(item.occurredAt, now)) continue;
        activity.push({
            id: `news:${item.id}`,
            kind: "news",
            tone: "info",
            title: "News post published",
            description: `${item.title} by ${item.authorName}.`,
            href: role === "POS" ? "/news" : "/staff/news",
            occurredAt: item.occurredAt,
        });
    }

    if (role === "ADMIN") {
        for (const item of sources.members) {
            if (!eventIsRecent(item.occurredAt, now)) continue;
            activity.push({
                id: `member:${item.id}`,
                kind: "member",
                tone: "info",
                title: "Membership application submitted",
                description: item.name,
                href: "/admin/memberships",
                occurredAt: item.occurredAt,
            });
        }
    }

    for (const item of sources.staffEvents) {
        if (role === "POS" || (item.branchId ? !branchAllowed(role, branchId, item.branchId) : role !== "ADMIN") || !eventIsRecent(item.occurredAt, now)) continue;
        activity.push({
            id: `staff:${item.id}`,
            kind: "staff",
            tone: "info",
            title: item.title,
            description: `By ${item.actorName}.`,
            href: role === "ADMIN" ? "/admin/staff" : "/staff/team",
            occurredAt: item.occurredAt,
            ...(item.branchName ? { branchName: item.branchName } : {}),
        });
    }

    if (role === "ADMIN") {
        for (const item of sources.branchEvents) {
            if (!eventIsRecent(item.occurredAt, now)) continue;
            activity.push({
                id: `branch:${item.id}`,
                kind: "branch",
                tone: "info",
                title: item.title,
                description: `${item.branchName} by ${item.actorName}.`,
                href: "/admin/branches",
                occurredAt: item.occurredAt,
                branchName: item.branchName,
            });
        }
    }

    return { attention, activity: activity.sort(byNewest).slice(0, 30) };
}

export function shouldShowNotificationDot(latestEventAt: Date | string | null, seenAt: Date | string | null, now = new Date()): boolean {
    if (!latestEventAt) return false;
    const latest = new Date(latestEventAt).getTime();
    if (!Number.isFinite(latest) || latest > now.getTime()) return false;
    if (!seenAt) return now.getTime() - latest <= RECENT_WINDOW_MS;
    const seen = new Date(seenAt).getTime();
    return Number.isFinite(seen) && latest > seen;
}

export function groupNotificationsByDay(items: NotificationItem[]) {
    const groups = new Map<string, { key: string; label: string; items: NotificationItem[] }>();
    for (const item of [...items].sort(byNewest)) {
        if (!item.occurredAt) continue;
        const key = getMalawiDateKey(item.occurredAt);
        const group = groups.get(key) ?? { key, label: formatBlantyreDay(item.occurredAt), items: [] };
        group.items.push(item);
        groups.set(key, group);
    }
    return [...groups.values()];
}