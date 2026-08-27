import { z } from "zod";

import { requiredIdSchema } from "@/lib/validations/common";

const optionalHexColorSchema = z
  .string()
  .trim()
  .refine(
    (value) => !value || /^#[0-9A-Fa-f]{6}$/.test(value),
    "Enter a valid hex color, for example #000000.",
  );

export const adminIdParamsSchema = z.object({
  id: requiredIdSchema,
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
});

export const createColorSchema = z.object({
  name: z.string().trim().min(1, "Color name is required."),
  hexacode: optionalHexColorSchema.default(""),
});

export const updateColorSchema = createColorSchema.extend({
  isActive: z.boolean().optional(),
});

export const createSizeSchema = z.object({
  name: z.string().trim().min(1, "Size name is required."),
  sortOrder: z.coerce
    .number()
    .int()
    .nonnegative("Sort order must be a whole number of 0 or greater."),
});

export const updateSizeSchema = createSizeSchema.extend({
  isActive: z.boolean().optional(),
});

export const adminNotificationActionSchema = z.union([
  z.object({
    markAll: z.literal(true),
  }),
  z.object({
    notificationId: requiredIdSchema,
    markAll: z.literal(false).optional(),
  }),
]);

export const adminOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"]),
});

export const cloudinaryCleanupSchema = z.object({
  publicIds: z.array(requiredIdSchema).max(100),
});
