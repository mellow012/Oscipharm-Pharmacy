import type { ExpiryNotRecordedGroup } from "@/features/reports/lib/expiry-watch";

export type BranchOption = {
    id: string;
    name: string;
    location: string | null;
};

export type SalesRow = {
    day: string;
    paymentMethod: string;
    isRefund: boolean;
    product: string;
    revenue: string;
    saleCount: number;
    lineCount: number;
};

export type MembershipSalesSummary = {
    grossAmount: string;
    discountAmount: string;
    netAmount: string;
    memberSaleCount: number;
    chronicSaleCount: number;
    chronicDiscountAmount: string;
    generalSaleCount: number;
    generalDiscountAmount: string;
    refundAmount: string;
    combinedNetAmount: string;
};

export type LowStockRow = {
    branchId: string;
    branchName: string;
    ingredientName: string;
    brandName: string;
    strength: string | null;
    availableUnits: number;
    reorderThreshold: number | null;
};

export type ExpiryRow = {
    branchName: string;
    ingredientName: string;
    brandName: string;
    batchNumber: string | null;
    expiryDate: string;
    remainingUnits: number;
    status: "Expired" | "Expiring soon" | "In date";
};

export type AuditRow = {
    createdAt: string;
    action: string;
    branchName: string;
    userName: string;
    saleId: string | null;
    details: string;
};

export type ReportsData = {
    branches: BranchOption[];
    sales: SalesRow[];
    membershipSales: MembershipSalesSummary;
    lowStock: LowStockRow[];
    expiry: ExpiryRow[];
    expiryNotRecorded: { count: number; groups: ExpiryNotRecordedGroup[] };
    audit: AuditRow[];
    range: { from: string; to: string };
    freshness: import("@/features/reports/lib/sales-freshness").SalesFreshness;
};
