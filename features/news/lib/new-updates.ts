type DateValue = string | Date | null | undefined;

function timestamp(value: DateValue): number | null {
    if (value === null || value === undefined || value === "") return null;
    const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export function shouldShowNewDot(latestPublishedAt: DateValue, seenAt: DateValue, now: DateValue, windowDays: number): boolean {
    const latest = timestamp(latestPublishedAt);
    const current = timestamp(now);
    if (latest === null || current === null || !Number.isFinite(windowDays) || windowDays < 0) return false;

    const age = current - latest;
    if (age < 0 || age > windowDays * 24 * 60 * 60 * 1000) return false;

    const seen = timestamp(seenAt);
    return seen === null || latest > seen;
}