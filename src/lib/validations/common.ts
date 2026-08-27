import { z } from "zod";

export const requiredIdSchema = z.string().trim().min(1, "ID is required.");

export const optionalTrimmedStringSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
  z.string().optional(),
);

export function positiveIntegerQuery(defaultValue: number, maximum: number) {
  return z.preprocess(
    (value) =>
      value === null || value === undefined || value === ""
        ? defaultValue
        : value,
    z.coerce.number().int().positive().max(maximum),
  );
}
