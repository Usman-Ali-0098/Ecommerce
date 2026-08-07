import { NextResponse } from "next/server";

import { getPublicProducts } from "@/lib/services/product.service";

export async function GET() {
  try {
    const products = await getPublicProducts();

    return NextResponse.json(
      {
        success: true,
        data: products,
      },
      {
        status: 200,
      }
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
      }
    );
  }
}