export const EXPIRY_WARNING_DAYS = 30;

export function getExpiryStatus(expiryDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const warningDate = new Date(today);
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

    if (expiryDate < today) return { label: "Expired", className: "text-danger", rowClassName: "bg-danger-bg/40" };
    if (expiryDate <= warningDate) return { label: "Expiring soon", className: "text-warn", rowClassName: "bg-warn-bg/45" };
    return { label: "In date", className: "text-primary", rowClassName: "" };
}