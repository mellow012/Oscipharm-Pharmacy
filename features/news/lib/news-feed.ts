export type NewsTab = "all" | "news" | "events";

export type NewsEvent = {
    eventStartsAt: Date | null;
    eventEndsAt: Date | null;
};

export type PublishedNewsItem = {
    publishedAt: Date;
};

export function normalizeTab(value: string | string[] | undefined): NewsTab {
    if (value === "news") return "news";
    if (value === "events") return "events";
    return "all";
}

export function eventEffectiveEnd(event: NewsEvent): Date | null {
    if (event.eventEndsAt) return event.eventEndsAt;
    if (!event.eventStartsAt) return null;

    const shiftedMs = event.eventStartsAt.getTime() + 2 * 60 * 60 * 1000;
    const dayStartMs = Math.floor(shiftedMs / 86_400_000) * 86_400_000;
    const endLocalMs = dayStartMs + 86_400_000 - 1;
    return new Date(endLocalMs - 2 * 60 * 60 * 1000);
}

export function isUpcomingEvent(event: NewsEvent, now: Date): boolean {
    const effectiveEnd = eventEffectiveEnd(event);
    return effectiveEnd !== null && effectiveEnd >= now;
}

export function orderUpcomingEvents<T extends NewsEvent>(events: readonly T[]): T[] {
    return [...events].sort((left, right) => {
        if (!left.eventStartsAt) return right.eventStartsAt ? 1 : 0;
        if (!right.eventStartsAt) return -1;
        return left.eventStartsAt.getTime() - right.eventStartsAt.getTime();
    });
}

export function orderPastEvents<T extends NewsEvent>(events: readonly T[]): T[] {
    return [...events].sort((left, right) => {
        const leftEnd = eventEffectiveEnd(left);
        const rightEnd = eventEffectiveEnd(right);
        if (!leftEnd) return rightEnd ? 1 : 0;
        if (!rightEnd) return -1;
        return rightEnd.getTime() - leftEnd.getTime();
    });
}

export function orderAll<T extends PublishedNewsItem>(items: readonly T[]): T[] {
    return [...items].sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());
}