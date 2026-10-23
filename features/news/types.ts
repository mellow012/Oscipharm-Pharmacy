import type { NewsType } from "@prisma/client";

export type NewsInputPayload = {
    title: string;
    type: NewsType;
    excerpt: string;
    body: string;
    eventStartsAt: string;
    eventEndsAt: string;
    eventLocation: string;
};

export type NewsActionResult =
    | { ok: true; newsId?: string; slug?: string }
    | { ok: false; message: string };