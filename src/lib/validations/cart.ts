import { z } from "zod";

import { requiredIdSchema } from "@/lib/validations/common";

export const cartItemParamsSchema = z.object({
  itemId: requiredIdSchema,
});

export const addCartItemSchema = z.object({
  variantId: requiredIdSchema,
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive("Quantity must be at least 1."),
});
