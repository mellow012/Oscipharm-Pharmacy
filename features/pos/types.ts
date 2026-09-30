export type PosProduct = {
    id: string;
    ingredientName: string;
    brandName: string;
    strength: string | null;
    packSize: number;
    unitLabel: string;
    allowsLooseSale: boolean;
    stockUnits: number;
    pricePerPack: string | null;
    pricePerUnit: string | null;
};

export type CartLine = {
    variantId: string;
    mode: "PACK" | "UNIT";
    quantity: number;
};

export type CheckoutState = {
    error?: string;
    receipt?: {
        saleId: string;
        subtotalAmount: string;
        discountAmount: string;
        membershipDiscountPercent: string;
        totalAmount: string;
        memberName?: string;
        paymentMethod: "CASH" | "MOBILE_MONEY";
        items: Array<{ label: string; quantity: number; mode: "PACK" | "UNIT"; subtotal: string }>;
    };
};