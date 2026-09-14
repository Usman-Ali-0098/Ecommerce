import { z } from "zod";

import { requiredIdSchema } from "@/lib/validations/common";

export const createCheckoutSchema = z.object({
  paymentMethod: z.enum(["CARD", "CASH_ON_DELIVERY"]).default("CARD"),
  cartItemIds: z
    .array(requiredIdSchema)
    .min(1, "Please select at least one cart item.")
    .max(100, "You can check out at most 100 cart items at once.")
    .transform((ids) => [...new Set(ids)]),
  shipping: z.lazy(() => shippingAddressSchema).optional(),
});

export const retryPaymentParamsSchema = z.object({
  orderId: requiredIdSchema,
});

export const checkoutDraftParamsSchema = z.object({
  checkoutId: requiredIdSchema,
});

export const cashOnDeliveryDraftSchema = z.object({
  checkoutId: requiredIdSchema,
});

export const shippingAddressSchema = z.object({
  shippingName: z.string().trim().min(2, "Enter the recipient name.").max(100),
  shippingEmail: z.string().trim().email("Enter a valid email address.").max(254),
  shippingPhone: z.string().trim().min(7, "Enter a valid phone number.").max(30),
  shippingAddress: z.string().trim().min(5, "Enter the delivery address.").max(250),
  shippingCity: z.string().trim().min(2, "Enter the city.").max(80),
  shippingPostalCode: z.string().trim().min(3, "Enter the postal code.").max(20),
  shippingCountry: z.string().trim().min(2).max(80).default("Pakistan"),
});

export const checkoutSessionParamsSchema = z.object({
  sessionId: requiredIdSchema,
});

export const cashOnDeliverySchema = z.object({
  orderId: requiredIdSchema,
});

export const paymentMethodActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("remove"),
    paymentMethodId: requiredIdSchema,
  }),
  z.object({
    action: z.literal("setDefault"),
    paymentMethodId: requiredIdSchema,
  }),
]);
