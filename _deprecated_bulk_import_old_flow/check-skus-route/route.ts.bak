import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";

const checkSkusSchema = z.object({
  skus: z.array(z.string().trim().min(1)).max(2000),
});

// Lets the bulk-import review screen show "this will update an existing
// product" before submitting — a plain lookup, not a mutation.
export async function POST(request: Request) {
  const admin = await getAdminSession();

  if (!admin) {
    return NextResponse.json({ success: false, message: "Admin authentication required." }, { status: 401 });
  }

  const validation = validateRequest(checkSkusSchema, await request.json());

  if (!validation.success) {
    return validation.response;
  }

  const skus = validation.data.skus.map((sku) => sku.trim().toUpperCase()).filter(Boolean);

  if (skus.length === 0) {
    return NextResponse.json({ success: true, data: { existing: [] } });
  }

  const variants = await prisma.productVariant.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, productId: true, product: { select: { name: true } } },
  });

  return NextResponse.json({
    success: true,
    data: {
      existing: variants.map((v) => ({ sku: v.sku, productId: v.productId, productName: v.product.name })),
    },
  });
}
