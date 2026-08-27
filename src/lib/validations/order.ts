import { z } from "zod";

import { positiveIntegerQuery } from "@/lib/validations/common";

export const orderListQuerySchema = z.object({
  page: positiveIntegerQuery(1, 1_000_000),
  pageSize: positiveIntegerQuery(20, 100),
});

export const createOrderSchema = z.object({
  cartItemIds: z
    .array(z.string().trim().min(1, "Cart item ID cannot be empty."))
    .min(1, "Please select at least one cart item.")
    .transform((ids) => [...new Set(ids)]),
});

export const orderStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});
