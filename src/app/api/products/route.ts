import { NextResponse } from "next/server";

import {
  getPublicProducts,
  type ProductSort,
} from "@/lib/services/product.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // FILTERS

    const category = searchParams.get("category")?.trim() || undefined;

    const search = searchParams.get("search")?.trim() || undefined;

    //  SORT

    const rawSort = searchParams.get("sort");

    const sort: ProductSort =
      rawSort === "oldest" ||
      rawSort === "price-low" ||
      rawSort === "price-high"
        ? rawSort
        : "newest";

    // PAGE

    const parsedPage = Number(searchParams.get("page"));

    const page =
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    //  PAGE SIZE

    const parsedPageSize = Number(searchParams.get("pageSize"));

    const pageSize =
      Number.isInteger(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 24)
        : 12;

    // GET PRODUCTS

    const result = await getPublicProducts({
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
