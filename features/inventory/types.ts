export const EXPIRY_WARNING_DAYS = 30;

export type ActionState = {
    error?: string;
    success?: string;
};

export type InventoryData = Awaited<ReturnType<typeof import("@/features/inventory/lib/queries").getInventoryData>>;