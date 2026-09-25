import { getMalawiDateKey } from "@/lib/timezone";

export const EXPIRY_WARNING_DAYS = 30;

export function getExpiryStatus(expiryDate: Date) {
    const now = new Date();
    const todayKey = getMalawiDateKey(now);
    const warningKey = getMalawiDateKey(new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000));
    const expiryKey = getMalawiDateKey(expiryDate);

    if (expiryKey < todayKey) return { label: "Expired", className: "text-danger", rowClassName: "bg-danger-bg/40" };
    if (expiryKey <= warningKey) return { label: "Expiring soon", className: "text-warn", rowClassName: "bg-warn-bg/45" };
    return { label: "In date", className: "text-primary", rowClassName: "" };
}