import type { ImportRunKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { NotificationSources } from "@/features/notifications/lib/notification-rules";

const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const STAFF_ACTIONS = [
    "STAFF_INVITATION_ACCEPTED",
    "STAFF_DEACTIVATED",
    "STAFF_REACTIVATED",
    "STAFF_ROLE_CHANGED",
    "STAFF_BRANCH_CHANGED",
] as const;

function safeCount(value: unknown, keys: string[]): number | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    for (const key of keys) {
        const candidate = Number(record[key]);
        if (Number.isSafeInteger(candidate) && candidate >= 0) return candidate;
    }
    return null;
}

function detailString(value: unknown, key: string): string | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const result = (value as Record<string, unknown>)[key];
    return typeof result === "string" && result.trim() ? result.trim() : null;
}

export async function getNotificationBranches(role: Role, branchId: string | null) {
    return prisma.branch.findMany({
        where: role === "ADMIN" ? {} : branchId ? { id: branchId } : { id: "__missing_branch__" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
    });
}

export async function getCommittedImportRows(branchIds: string[]) {
    if (!branchIds.length) return [];
    return prisma.importRun.findMany({
        where: { branchId: { in: branchIds }, status: "COMMITTED", committedAt: { not: null } },
        select: { id: true, branchId: true, kind: true, committedAt: true },
        orderBy: { committedAt: "desc" },
    });
}

export async function getBatchStockLevels(branchIds: string[]) {
    if (!branchIds.length) return [];
    return prisma.batch.findMany({
        where: { branchId: { in: branchIds }, quantityRemaining: { gt: 0 } },
        select: { branchId: true, variantId: true, quantityRemaining: true, expiryDate: true, expiryDateKnown: true },
    });
}

export async function getBranchReorderPoints(branchIds: string[]) {
    if (!branchIds.length) return [];
    return prisma.branchPrice.findMany({
        where: { branchId: { in: branchIds }, reorderThreshold: { not: null } },
        select: { branchId: true, variantId: true, reorderThreshold: true },
    });
}

export async function getLatestImportShortfalls(branchIds: string[], importRows: Array<{ id: string; branchId: string; kind: ImportRunKind }>) {
    if (!branchIds.length) return [];
    const latestSalesRunByBranch = new Map<string, string>();
    for (const row of importRows) {
        if (row.kind === "SALES" && !latestSalesRunByBranch.has(row.branchId)) latestSalesRunByBranch.set(row.branchId, row.id);
    }
    const runIds = [...latestSalesRunByBranch.values()];
    if (!runIds.length) return [];
    const items = await prisma.saleItem.findMany({
        where: {
            unallocatedUnits: { gt: 0 },
            sale: { is: { importRunId: { in: runIds }, stockAffected: true } },
        },
        select: { unallocatedUnits: true, sale: { select: { branchId: true, importRunId: true } } },
    });
    const totals = new Map<string, number>();
    for (const item of items) {
        if (item.sale.importRunId) totals.set(item.sale.branchId, (totals.get(item.sale.branchId) ?? 0) + item.unallocatedUnits);
    }
    return [...totals].map(([branchId, units]) => ({ branchId, units }));
}

export async function getRecentImportEvents(role: Role, branchId: string | null, since: Date) {
    const auditRows = await prisma.auditLog.findMany({
        where: {
            action: "IMPORT_COMMITTED",
            createdAt: { gte: since },
            ...(role === "ADMIN" ? {} : branchId ? { branchId } : { branchId: "__missing_branch__" }),
        },
        select: { id: true, branchId: true, createdAt: true, details: true, branch: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
    const runIds = auditRows.flatMap((row) => {
        const runId = detailString(row.details, "importRunId");
        return runId ? [runId] : [];
    });
    if (!runIds.length) return [];
    const runs = await prisma.importRun.findMany({
        where: { id: { in: runIds }, status: "COMMITTED" },
        select: { id: true, kind: true, counts: true },
    });
    const runById = new Map(runs.map((run) => [run.id, run]));
    return auditRows.flatMap((row) => {
        const runId = detailString(row.details, "importRunId");
        const run = runId ? runById.get(runId) : null;
        if (!run || !row.branchId || !row.branch) return [];
        return [{
            id: run.id,
            branchId: row.branchId,
            branchName: row.branch.name,
            actorName: row.user.name,
            kind: run.kind,
            committedAt: row.createdAt,
            rowsOrReceipts: safeCount(run.counts, run.kind === "SALES" ? ["completedDocuments", "totalDocuments", "receipts"] : ["committedRows", "totalRows", "rows"]),
            shortfallUnits: safeCount(run.counts, ["unallocatedUnits"]) ?? 0,
        }];
    });
}

export async function getRecentNewsEvents(since: Date) {
    return prisma.news.findMany({
        where: { status: "PUBLISHED", publishedAt: { gte: since } },
        select: { id: true, title: true, publishedAt: true, createdBy: { select: { name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 30,
    }).then((rows) => rows.map((row) => ({ id: row.id, title: row.title, authorName: row.createdBy.name, occurredAt: row.publishedAt })));
}

export async function getPendingMembershipCount(role: Role) {
    if (role === "POS") return 0;
    return prisma.membershipApplication.count({ where: { status: "PENDING" } });
}

export async function getRecentMembershipEvents(role: Role, since: Date) {
    if (role !== "ADMIN") return [];
    return prisma.membershipApplication.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, fullName: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
    }).then((rows) => rows.map((row) => ({ id: row.id, name: row.fullName, occurredAt: row.createdAt })));
}

export async function getRecentStaffEvents(role: Role, branchId: string | null, since: Date) {
    if (role === "POS") return [];
    const rows = await prisma.auditLog.findMany({
        where: {
            action: { in: [...STAFF_ACTIONS] },
            ...(role === "ADMIN" ? {} : { OR: [{ branchId: branchId ?? "__missing_branch__" }, { branchId: null }] }),
            createdAt: { gte: since },
        },
        select: { id: true, branchId: true, createdAt: true, action: true, details: true, branch: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
    const targetIds = rows.flatMap((row) => {
        const targetId = detailString(row.details, "targetUserId");
        return targetId ? [targetId] : [];
    });
    const targets = targetIds.length ? await prisma.user.findMany({
        where: { id: { in: targetIds } },
        select: { id: true, branchId: true, branch: { select: { name: true } } },
    }) : [];
    const scopedBranch = role !== "ADMIN" && branchId
        ? await prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } })
        : null;
    const targetById = new Map(targets.map((target) => [target.id, target]));
    return rows.flatMap((row) => {
        const targetId = detailString(row.details, "targetUserId");
        const target = targetId ? targetById.get(targetId) : null;
        const eventBranchIds = [
            row.branchId,
            target?.branchId ?? null,
            detailString(row.details, "previousBranchId"),
            detailString(row.details, "newBranchId"),
        ].filter((value): value is string => Boolean(value));
        if (role !== "ADMIN" && !eventBranchIds.includes(branchId ?? "")) return [];
        const eventBranchId = role === "ADMIN" ? row.branchId ?? target?.branchId ?? null : branchId;
        const title = row.action === "STAFF_INVITATION_ACCEPTED" ? "Staff invitation accepted" : "Staff access updated";
        const branchName = role === "ADMIN"
            ? row.branch?.name ?? target?.branch?.name ?? null
            : scopedBranch?.name ?? row.branch?.name ?? target?.branch?.name ?? null;
        return [{ id: row.id, branchId: eventBranchId, branchName, actorName: row.user.name, title, occurredAt: row.createdAt }];
    });
}

export async function getRecentBranchEvents(role: Role, since: Date) {
    if (role !== "ADMIN") return [];
    const rows = await prisma.auditLog.findMany({
        where: {
            createdAt: { gte: since },
            OR: [
                { action: "BRANCH_CREATED" },
                { action: "BRANCH_UPDATED", details: { path: ["event"], equals: "BRANCH_ARCHIVED" } },
            ],
        },
        select: { id: true, action: true, createdAt: true, details: true, branch: { select: { name: true } }, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
    });
    return rows.flatMap((row) => {
        const event = detailString(row.details, "event");
        const title = row.action === "BRANCH_CREATED" ? "Branch created"
            : event === "BRANCH_ARCHIVED" ? "Branch archived" : null;
        const branchName = row.branch?.name ?? detailString(row.details, "branchName");
        return title && branchName ? [{ id: row.id, branchName, actorName: row.user.name, title, occurredAt: row.createdAt }] : [];
    });
}

export async function getNotificationPageSources(role: Role, branchId: string | null, now = new Date()): Promise<NotificationSources> {
    const since = new Date(now.getTime() - RECENT_WINDOW_MS);
    const branches = await getNotificationBranches(role, branchId);
    const branchIds = branches.map((branch) => branch.id);
    const [importRows, imports, news, pendingMembershipCount, members, staffEvents, branchEvents, stockLevels, reorderPoints] = await Promise.all([
        getCommittedImportRows(branchIds),
        getRecentImportEvents(role, branchId, since),
        getRecentNewsEvents(since),
        getPendingMembershipCount(role),
        getRecentMembershipEvents(role, since),
        getRecentStaffEvents(role, branchId, since),
        getRecentBranchEvents(role, since),
        role === "POS" ? Promise.resolve([]) : getBatchStockLevels(branchIds),
        role === "POS" ? Promise.resolve([]) : getBranchReorderPoints(branchIds),
    ]);
    const latestImports = new Map<string, { stock: Date | null; latest: Date | null }>();
    for (const row of importRows) {
        const summary = latestImports.get(row.branchId) ?? { stock: null, latest: null };
        if (!summary.latest) summary.latest = row.committedAt;
        if (row.kind === "STOCK" && !summary.stock) summary.stock = row.committedAt;
        latestImports.set(row.branchId, summary);
    }
    const shortfalls = await getLatestImportShortfalls(branchIds, importRows);
    const activeReorderPoints = reorderPoints.flatMap((point) => point.reorderThreshold === null ? [] : [{ ...point, reorderThreshold: point.reorderThreshold }]);
    return {
        now,
        branches: branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            latestStockImportAt: latestImports.get(branch.id)?.stock ?? null,
            latestImportAt: latestImports.get(branch.id)?.latest ?? null,
        })),
        pendingMembershipCount,
        batchExpiries: stockLevels.map(({ branchId: id, expiryDate, expiryDateKnown }) => ({ branchId: id, expiryDate, expiryDateKnown })),
        stockLevels,
        reorderPoints: activeReorderPoints,
        shortfalls,
        imports,
        news,
        members,
        staffEvents,
        branchEvents,
    };
}