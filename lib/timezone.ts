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
