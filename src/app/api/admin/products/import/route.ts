import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { JobsServiceError, sendProductImportJob } from "@/lib/jobs-client";
import { validateRequest } from "@/lib/validate-request";
import { createAdminProductSchema } from "@/lib/validations/admin-product";

// Same per-product shape /api/admin/products validates for a single create —
// bulk import is just N of these, processed by the jobs service instead of
// inline in this request.
const importRequestSchema = z.object({
  products: z.array(createAdminProductSchema).min(1, "At least one product is required.").max(500),
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Admin authentication required." },
        { status: 401 },
      );
    }

    const validation = validateRequest(importRequestSchema, await request.json());

    if (!validation.success) {
      return validation.response;
    }

    const { jobId } = await sendProductImportJob({
      products: validation.data.products,
      requestedBy: admin.id,
    });

    return NextResponse.json({ success: true, data: { jobId } }, { status: 202 });
  } catch (error) {
    if (error instanceof JobsServiceError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 502 },
      );
    }

    console.error("Admin product import error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to start product import." },
      { status: 500 },
    );
  }
}
