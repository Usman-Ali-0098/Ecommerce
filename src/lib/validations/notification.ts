import { z } from "zod";

import {
  optionalTrimmedStringSchema,
  positiveIntegerQuery,
  requiredIdSchema,
} from "@/lib/validations/common";

export const notificationListQuerySchema = z.object({
  cursor: optionalTrimmedStringSchema,
  limit: positiveIntegerQuery(10, 50),
});

export const notificationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("markOneRead"),
    notificationId: requiredIdSchema,
  }),
  z.object({
    action: z.literal("markAllRead"),
  }),
]);
