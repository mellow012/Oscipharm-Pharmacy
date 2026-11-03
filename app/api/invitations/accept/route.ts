import { acceptInvitation, INVALID_STAFF_INVITATION_MESSAGE } from "@/features/admin/lib/staff-invitation-service";

function response(body: Record<string, unknown>, status: number) {
    return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
    let parsed: unknown;
    try {
        parsed = await request.json();
    } catch {
        return response({ message: INVALID_STAFF_INVITATION_MESSAGE }, 400);
    }

    const body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as { token?: unknown; name?: unknown; password?: unknown }
        : {};
    const token = body.token;
    const name = body.name;
    const password = body.password;
    if (typeof token !== "string" || typeof name !== "string" || typeof password !== "string") {
        return response({ message: INVALID_STAFF_INVITATION_MESSAGE }, 400);
    }

    try {
        const result = await acceptInvitation(token, { name, password });
        if (!result.ok) return response({ message: INVALID_STAFF_INVITATION_MESSAGE }, 400);
        return response({ ok: true }, 200);
    } catch {
        return response({ message: "Something went wrong. Try again." }, 500);
    }
}