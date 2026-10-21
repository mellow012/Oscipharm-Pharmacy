import { isValidNewPassword } from "@/lib/password";
import { redeemPasswordResetToken } from "@/features/auth/lib/password-reset";

const INVALID_MESSAGE = "This reset link is invalid or expired. Request a new one and try again.";

export async function POST(request: Request) {
    const parsed = await request.json().catch(() => null);
    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as { token?: unknown; password?: unknown }
        : {};
    const token = body.token;
    const password = body.password;

    if (typeof token !== "string" || typeof password !== "string" || !isValidNewPassword(password)) {
        return Response.json({ message: INVALID_MESSAGE }, { status: 400 });
    }

    try {
        const user = await redeemPasswordResetToken(token, password);
        if (!user) return Response.json({ message: INVALID_MESSAGE }, { status: 400 });
        return Response.json({ message: "Password updated. You can now sign in." }, { status: 200 });
    } catch (error) {
        const details = error as { name?: unknown; code?: unknown };
        console.error("Password reset redemption failed.", {
            name: details?.name,
            code: details?.code,
        });
        return Response.json({ message: INVALID_MESSAGE }, { status: 400 });
    }
}