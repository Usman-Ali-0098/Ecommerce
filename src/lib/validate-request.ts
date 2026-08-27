import { NextResponse } from "next/server";
import type { z } from "zod";

type ValidationSuccess<T> = {
  success: true;
  data: T;
};

type ValidationFailure = {
  success: false;
  response: NextResponse;
};

export function validateRequest<T>(
  schema: z.ZodType<T>,
  input: unknown,
): ValidationSuccess<T> | ValidationFailure {
  const result = schema.safeParse(input);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  const errors: Record<string, string[]> = {};

  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "request";

    errors[field] = [...(errors[field] ?? []), issue.message];
  }

  return {
    success: false,
    response: NextResponse.json(
      {
        success: false,
        message: "Invalid request parameters.",
        errors,
      },
      { status: 400 },
    ),
  };
}
