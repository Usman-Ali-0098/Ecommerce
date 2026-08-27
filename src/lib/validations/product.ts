import { z } from "zod";

import {
  optionalTrimmedStringSchema,
  positiveIntegerQuery,
} from "@/lib/validations/common";

export const publicProductQuerySchema = z.object({
  category: optionalTrimmedStringSchema,
  search: optionalTrimmedStringSchema,
  sort: z.preprocess(
    (value) => (value === null || value === undefined || value === "" ? "newest" : value),
    z.enum(["newest", "oldest", "price-low", "price-high"]),
  ),
  page: positiveIntegerQuery(1, 1_000_000),
  pageSize: positiveIntegerQuery(12, 24),
});
