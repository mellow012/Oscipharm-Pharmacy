const NEWS_TIME_ZONE = "Africa/Blantyre";

export function formatNewsDate(date: Date, includeTime = false) {
    return new Intl.DateTimeFormat("en-MW", {
        timeZone: NEWS_TIME_ZONE,
        dateStyle: "medium",
        ...(includeTime ? { timeStyle: "short" as const } : {}),
    }).format(date);
}