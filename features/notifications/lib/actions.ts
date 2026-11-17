"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function markNotificationsSeenAction() {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { ok: false as const, available: false };

    try {
        await prisma.staffNotificationState.upsert({
            where: { userId },
            create: { userId, seenAt: new Date() },
            update: { seenAt: new Date() },
        });
        return { ok: true as const, available: true };
    } catch {
        return { ok: false as const, available: false };
    }
}