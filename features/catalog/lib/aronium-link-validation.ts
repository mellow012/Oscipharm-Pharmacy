import { z } from "zod";

const aroniumProductLinkInputSchema = z.object({
    aroniumCode: z.string().trim().min(1, "Enter an Aronium product code.").max(100, "Aronium product codes must be 100 characters or fewer."),
    variantId: z.string().trim().min(1, "Choose a product variant."),
    mode: z.enum(["PACK", "UNIT"]),
});

export function validateAroniumProductLink(
    input: unknown,
    allowsLooseSale: boolean,
    conflicts: { aroniumCodeExists?: boolean; variantModeExists?: boolean } = {},
) {
    const parsed = aroniumProductLinkInputSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid Aronium product link." };
    if (parsed.data.mode === "UNIT" && !allowsLooseSale) {
        return { error: "Unit mode is only available for variants that allow loose sales." };
    }
    if (conflicts.aroniumCodeExists) return { error: "That Aronium product code is already linked." };
    if (conflicts.variantModeExists) return { error: `This variant already has an Aronium link for ${parsed.data.mode} mode.` };
    return { data: parsed.data };
}