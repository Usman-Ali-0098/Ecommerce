import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getPublicProducts } from "@/lib/services/product.service";
import { validateRequest } from "@/lib/validate-request";
import { publicProductQuerySchema } from "@/lib/validations/product";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    const validation = validateRequest(
      publicProductQuerySchema,
      Object.fromEntries(searchParams),
    );

    if (!validation.success) {
      return validation.response;
    }

    const { category, search, sort, page, pageSize } = validation.data;

    // GET PRODUCTS

    const result = await getPublicProducts({
      userId:
        session?.user?.role === "USER" ? Number(session.user.id) : undefined,
      category,
      search,
      sort,
      page,
      pageSize,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Get products error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to fetch products.",
      },
      {
        status: 500,
      },
    );
  }
}
