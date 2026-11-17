import type { Role } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { shouldShowNotificationDot } from "@/features/notifications/lib/notification-rules";
import { STAFF_NOTIFICATIONS_CACHE_TAG } from "@/features/notifications/lib/notification-cache";
import { getNotificationPageSources } from "@/features/notifications/lib/notification-sources";

const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

async function getLatestStaffEventAt(role: Role, branchId: string | null, since: Date) {
    if (role === "POS") return null;
    const actions = ["STAFF_INVITATION_ACCEPTED", "STAFF_DEACTIVATED", "STAFF_REACTIVATED", "STAFF_ROLE_CHANGED", "STAFF_BRANCH_CHANGED"] as const;
    if (role === "ADMIN") {
        return prisma.auditLog.findFirst({
            where: { action: { in: [...actions] }, createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        });
    }
    if (!branchId) return null;
    const rows = await prisma.auditLog.findMany({
        where: { action: { in: [...actions] }, createdAt: { gte: since }, OR: [{ branchId }, { branchId: null }] },
        orderBy: { createdAt: "desc" },
        select: { branchId: true, createdAt: true, details: true },
    });
    const targetIds = rows.flatMap((row) => {
        const details = row.details;
        if (!details || typeof details !== "object" || Array.isArray(details)) return [];
        const id = (details as Record<string, unknown>).targetUserId;
        return typeof id === "string" ? [id] : [];
    });
    const targets = targetIds.length ? await prisma.user.findMany({ where: { id: { in: targetIds } }, select: { id: true, branchId: true } }) : [];
    const targetBranchById = new Map(targets.map((target) => [target.id, target.branchId]));
    const relevant = rows.filter((row) => {
        if (row.branchId === branchId) return true;
        if (row.branchId !== null || !row.details || typeof row.details !== "object" || Array.isArray(row.details)) return false;
        const details = row.details as Record<string, unknown>;
        const targetId = typeof details.targetUserId === "string" ? details.targetUserId : null;
        return targetBranchById.get(targetId ?? "") === branchId || details.previousBranchId === branchId || details.newBranchId === branchId;
    });
    return relevant[0] ?? null;
}

const latestStaffEventsCache = unstable_cache(
    async (role: Role, branchId: string | null) => {
        const since = new Date(Date.now() - RECENT_WINDOW_MS);
        const importScope = role === "ADMIN" ? {} : branchId ? { branchId } : { branchId: "__missing_branch__" };
        const [latestImport, latestNews, latestMembership, latestStaff, branchAudit] = await Promise.all([
            prisma.importRun.findFirst({ where: { ...importScope, status: "COMMITTED", committedAt: { gte: since } }, orderBy: { committedAt: "desc" }, select: { committedAt: true } }),
            prisma.news.findFirst({ where: { status: "PUBLISHED", publishedAt: { gte: since } }, orderBy: { publishedAt: "desc" }, select: { publishedAt: true } }),
            role === "POS" ? Promise.resolve(null) : prisma.membershipApplication.findFirst({ where: { createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
            getLatestStaffEventAt(role, branchId, since),
            role === "ADMIN" ? prisma.auditLog.findMany({ where: { action: { in: ["BRANCH_CREATED", "BRANCH_UPDATED"] }, createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, select: { createdAt: true, action: true, details: true } }) : Promise.resolve([]),
        ]);
        const branchEvents = branchAudit.filter((row) => row.action === "BRANCH_CREATED" || (
            row.details && typeof row.details === "object" && !Array.isArray(row.details)
            && String((row.details as Record<string, unknown>).event) === "BRANCH_ARCHIVED"
        ));
        const dates = [latestImport?.committedAt, latestNews?.publishedAt, latestMembership?.createdAt, latestStaff?.createdAt, ...branchEvents.map((row) => row.createdAt)]
            .filter((date): date is Date => date instanceof Date);
        return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString() : null;
    },
    ["staff-notification-latest-event"],
    { revalidate: 60, tags: [STAFF_NOTIFICATIONS_CACHE_TAG] },
);

export function getLatestEventAt(role: Role, branchId: string | null) {
    return latestStaffEventsCache(role, branchId);
}

const readNotificationState = cache(async (userId: string) => {
    try {
        const state = await prisma.staffNotificationState.findUnique({ where: { userId }, select: { seenAt: true } });
        return { available: true, seenAt: state?.seenAt ?? null };
    } catch {
        return { available: false, seenAt: null };
    }
});

export function getNotificationState(userId: string) {
    return readNotificationState(userId);
}

export async function getStaffNotificationShellState(userId: string, role: Role, branchId: string | null) {
    const [latestEventAt, state] = await Promise.all([
        getLatestEventAt(role, branchId).catch(() => null),
        getNotificationState(userId),
    ]);
    return {
        available: state.available,
        hasNew: state.available && shouldShowNotificationDot(latestEventAt, state.seenAt),
    };
}

export async function getNotificationsForPage(role: Role, branchId: string | null) {
    return getNotificationPageSources(role, branchId);
}