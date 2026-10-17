import type { SaleMode } from "@prisma/client";

export type AroniumLinkActionState = {
    error?: string;
    success?: string;
};

export type StaffCatalogVariant = {
    id: string;
    brandName: string;
    strength: string | null;
    packSize: number;
    unitLabel: string;
    allowsLooseSale: boolean;
    isActive: boolean;
    pricePerPack: string | null;
    pricePerUnit: string | null;
    stock: number;
    aroniumProductLinks: Array<{
        id: string;
        aroniumCode: string;
        mode: SaleMode;
    }>;
};

export type StaffCatalogCategory = {
    id: string;
    name: string;
    ingredients: Array<{
        id: string;
        name: string;
        variants: StaffCatalogVariant[];
    }>;
};

export type StaffCatalogUncategorizedVariant = StaffCatalogVariant & {
    ingredient: { id: string; name: string } | null;
};