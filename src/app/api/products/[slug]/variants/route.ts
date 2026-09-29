import { NextResponse } from "next/server";

import { getProductVariantsBySlug } from "@/lib/chat-tools-public";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

/** Public, no auth needed -- same data as the storefront's own product
 * cards (color/size/stock), just keyed by slug. Used by the chat widget's
 * "Add to Cart" button: a real click needs to know a product's variants
 * immediately, without waiting on an LLM round-trip for what's ultimately
 * a deterministic lookup -- the conversational path (asking in words) still
 * goes through the get_product_variants tool, which calls the exact same
 * underlying function. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { slug } = await params;
    const result = await getProductVariantsBySlug(slug);

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Product not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Get product variants error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load product options." },
      { status: 500 },
    );
  }
}
