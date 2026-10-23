import { parseBlantyreLocalDateTime } from "../../../lib/timezone.ts";

export const limits = {
    title: 150,
    excerpt: 300,
    body: 20000,
    location: 200,
} as const;

export type NewsTypeValue = "NEWS" | "EVENT";

export type NewsInput = {
    title: string;
    type: NewsTypeValue;
    excerpt: string | null;
    body: string;
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
    eventLocation: string | null;
};

export function validateNewsInput(raw: unknown, _mode: "create" | "edit"):
    | { ok: true; data: NewsInput }
    | { ok: false; message: string } {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false, message: "Enter valid post details." };
    }

    const input = raw as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const body = typeof input.body === "string" ? input.body.trim() : "";
    const type = input.type;
    if (input.excerpt !== undefined && input.excerpt !== null && typeof input.excerpt !== "string") {
        return { ok: false, message: "Excerpt must be text." };
    }
    const excerptText = typeof input.excerpt === "string" ? input.excerpt.trim() : "";

    if (!title) return { ok: false, message: "Title is required." };
    if (title.length > limits.title) return { ok: false, message: `Title must be ${limits.title} characters or fewer.` };
    if (!body) return { ok: false, message: "Body is required." };
    if (body.length > limits.body) return { ok: false, message: `Body must be ${limits.body} characters or fewer.` };
    if (type !== "NEWS" && type !== "EVENT") return { ok: false, message: "Choose News or Event." };
    if (excerptText.length > limits.excerpt) return { ok: false, message: `Excerpt must be ${limits.excerpt} characters or fewer.` };

    if (type === "NEWS") {
        return {
            ok: true,
            data: { title, type, excerpt: excerptText || null, body, eventStartsAt: null, eventEndsAt: null, eventLocation: null },
        };
    }

    if (typeof input.eventStartsAt !== "string") return { ok: false, message: "Enter a valid event start date and time in Malawi time." };
    const startText = input.eventStartsAt.trim();
    const eventStartsAt = parseBlantyreLocalDateTime(startText);
    if (!eventStartsAt) return { ok: false, message: "Enter a valid event start date and time in Malawi time." };

    if (input.eventEndsAt !== undefined && input.eventEndsAt !== null && typeof input.eventEndsAt !== "string") {
        return { ok: false, message: "Enter a valid event end date and time in Malawi time." };
    }
    const endText = typeof input.eventEndsAt === "string" ? input.eventEndsAt.trim() : "";
    const eventEndsAt = endText ? parseBlantyreLocalDateTime(endText) : null;
    if (endText && !eventEndsAt) return { ok: false, message: "Enter a valid event end date and time in Malawi time." };
    if (eventEndsAt && eventEndsAt < eventStartsAt) return { ok: false, message: "Event end must be at or after its start." };

    if (input.eventLocation !== undefined && input.eventLocation !== null && typeof input.eventLocation !== "string") {
        return { ok: false, message: "Location must be text." };
    }
    const locationText = typeof input.eventLocation === "string" ? input.eventLocation.trim() : "";
    if (locationText.length > limits.location) return { ok: false, message: `Location must be ${limits.location} characters or fewer.` };

    return {
        ok: true,
        data: {
            title,
            type,
            excerpt: excerptText || null,
            body,
            eventStartsAt,
            eventEndsAt,
            eventLocation: locationText || null,
        },
    };
}

export function decideNewsAccess({
    actor,
    canManageNews,
    authorId,
}: {
    actor: { id: string; role: string; isActive: boolean } | null;
    canManageNews: boolean;
    authorId: string;
}) {
    return Boolean(
        actor
        && actor.isActive
        && canManageNews
        && (actor.role === "ADMIN" || actor.id === authorId)
    );
}

export function slugWithSuffix(base: string, attempt: number) {
    const suffix = attempt <= 1 ? "" : `-${Math.floor(attempt)}`;
    const suffixWithinLimit = suffix.slice(-120);
    return `${base.slice(0, Math.max(0, 120 - suffixWithinLimit.length))}${suffixWithinLimit}`;
}

export function publicNewsWhere(type: NewsTypeValue) {
    return { status: "PUBLISHED" as const, type };
}