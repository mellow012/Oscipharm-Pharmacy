const MALAWI_TIMEZONE = "Africa/Blantyre";

function formatMalawiParts(date: Date) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: MALAWI_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });

    const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
    }, {});

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
    };
}

export function getMalawiDateKey(date: Date) {
    const { year, month, day } = formatMalawiParts(date);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isExpiredInMalawi(expiryDate: Date, now = new Date()) {
    return getMalawiDateKey(expiryDate) < getMalawiDateKey(now);
}

export function isSellableInMalawi(expiryDate: Date, now = new Date()) {
    return !isExpiredInMalawi(expiryDate, now);
}

export function parseMalawiDate(dateString: string) {
    return new Date(`${dateString}T00:00:00+02:00`);
}

export function endOfMalawiDate(dateString: string) {
    return new Date(`${dateString}T23:59:59.999+02:00`);
}

export function parseBlantyreLocalDateTime(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
    if (!match) return null;

    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const calendarDate = new Date(0);
    calendarDate.setUTCHours(0, 0, 0, 0);
    calendarDate.setUTCFullYear(year, month - 1, day);

    if (
        calendarDate.getUTCFullYear() !== year
        || calendarDate.getUTCMonth() !== month - 1
        || calendarDate.getUTCDate() !== day
        || hour > 23
        || minute > 59
    ) return null;

    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour - 2, minute, 0, 0);
    return date;
}

export function formatBlantyreInputValue(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: MALAWI_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
    }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatBlantyreDateTime(date: Date) {
    return new Intl.DateTimeFormat("en-MW", {
        timeZone: MALAWI_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}
