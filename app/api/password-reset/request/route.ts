import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    AUTH_THROTTLE_SCOPES,
    getAuthThrottleSecret,
    getTrustedClientIp,
    hashAuthThrottleSubject,
    normalizeAuthEmail,
    recordPasswordResetRequestThrottle,
} from "@/features/auth/lib/auth-throttle";
import { createPasswordResetTokenForUser, sendPasswordResetEmail } from "@/features/auth/lib/password-reset";

const GENERIC_MESSAGE = "If an account exists for that email, a reset link has been sent.";

export async function POST(request: Request) {
    try {
        const parsed = (await request.json().catch(() => ({}))) as { email?: unknown };
        const email = normalizeAuthEmail(typeof parsed.email === "string" ? parsed.email : "");
        const ip = getTrustedClientIp(Object.fromEntries(request.headers.entries()));
        const secret = getAuthThrottleSecret();
        const emailHash = hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetEmail, email, secret);
        const ipHash = ip ? hashAuthThrottleSubject(AUTH_THROTTLE_SCOPES.resetIp, ip, secret) : null;
        const allowed = await recordPasswordResetRequestThrottle(prisma, emailHash, ipHash);

        if (allowed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            after(async () => {
                try {
                    const user = await prisma.user.findUnique({
                        where: { email },
                        select: { id: true, email: true },
                    });
                    if (!user) return;
                    const { token } = await createPasswordResetTokenForUser(user.id);
                    await sendPasswordResetEmail(user.email, token);
                } catch (error) {
                    const details = error as { name?: unknown; code?: unknown };
                    console.error("Password reset request processing failed.", {
                        name: details?.name,
                        code: details?.code,
                    });
                }
            });
        }
    } catch (error) {
        const details = error as { name?: unknown; code?: unknown };
        console.error("Password reset request throttling failed.", {
            name: details?.name,
            code: details?.code,
        });
    }

    return Response.json({ message: GENERIC_MESSAGE }, { status: 200 });
}