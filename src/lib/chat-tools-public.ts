import type { FunctionDeclaration } from "@google/genai";

import { prisma } from "@/lib/prisma";

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  imageUrl: string | null;
};

/** Tools available to every tier, guests included -- this is public catalog
 * data, not account-specific, so there's no reason to gate it behind auth.
 *
 * Exists specifically because vector search (KnowledgeChunk / RAG) cannot
 * correctly answer "highest/lowest price," "how many," or "cheapest in
 * category X" style questions: semantic similarity retrieves a small
 * top-K sample of chunks whose *wording* is closest to the question, which
 * has no relationship to actual numeric ranking across the full catalog.
 * This runs a real SQL query instead -- the only correct way to answer an
 * aggregate/superlative question. */
export const PUBLIC_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "search_products",
    description:
      "Searches the live product catalog with real price filters and sorting. Use this for ANY question involving price ranking, comparison, or counting -- 'most expensive', 'cheapest', 'highest/lowest price', 'how many products under X', 'anything in stock under Rs 5000' -- instead of answering from memory or from <context>. This queries the actual current catalog, not a retrieved sample, so it is the only reliable source for these questions.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        sortBy: {
          type: "string",
          enum: ["price_asc", "price_desc", "newest"],
          description:
            "price_desc for 'highest/most expensive', price_asc for 'lowest/cheapest', newest as a default otherwise.",
        },
        category: { type: "string", description: "Filter by category name, if the customer named one." },
        maxPrice: { type: "number", description: "Only include items at or below this price." },
        minPrice: { type: "number", description: "Only include items at or above this price." },
        inStockOnly: { type: "boolean", description: "Only include items currently in stock." },
        limit: { type: "integer", description: "Max results to return. Default 5, max 10." },
      },
      additionalProperties: false,
    },
  },
];

function clampInt(value: unknown, fallback: number, max: number, min = 1): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(Math.floor(n), max);
}

/** Returns both the compact JSON handed back to Gemini (`modelResult`) and
 * the richer `cards` used to render product cards in the UI -- kept
 * separate so the model's context doesn't get bloated with image URLs it
 * has no use for. */
export async function runPublicTool(
  name: string,
  args: Record<string, unknown>,
): Promise<{ modelResult: Record<string, unknown>; cards: ProductCard[] }> {
  switch (name) {
    case "search_products": {
      const limit = clampInt(args.limit, 5, 10);
      const sortBy = args.sortBy === "price_asc" || args.sortBy === "price_desc" ? args.sortBy : "newest";
      const category = typeof args.category === "string" ? args.category.trim() : undefined;
      const minPrice = typeof args.minPrice === "number" ? args.minPrice : undefined;
      const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : undefined;
      const inStockOnly = args.inStockOnly === true;

      const variants = await prisma.productVariant.findMany({
        where: {
          isActive: true,
          ...(inStockOnly ? { stock: { gt: 0 } } : {}),
          ...(minPrice !== undefined ? { price: { gte: minPrice } } : {}),
          ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
          product: {
            isActive: true,
            category: {
              isActive: true,
              ...(category ? { name: { equals: category, mode: "insensitive" } } : {}),
            },
          },
        },
        select: {
          price: true,
          stock: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: { select: { name: true } },
              images: {
                orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
        orderBy:
          sortBy === "price_asc"
            ? { price: "asc" }
            : sortBy === "price_desc"
              ? { price: "desc" }
              : { createdAt: "desc" },
        take: limit,
      });

      const cards: ProductCard[] = variants.map((variant) => ({
        id: variant.product.id,
        slug: variant.product.slug,
        name: variant.product.name,
        category: variant.product.category.name,
        price: Number(variant.price),
        inStock: variant.stock > 0,
        imageUrl: variant.product.images[0]?.url ?? null,
      }));

      return {
        modelResult: {
          count: cards.length,
          products: cards.map((card) => ({
            name: card.name,
            category: card.category,
            price: card.price,
            inStock: card.inStock,
          })),
        },
        cards,
      };
    }

    default:
      return { modelResult: { error: `Unknown tool: ${name}` }, cards: [] };
  }
}

/** Fallback card lookup for plain descriptive product questions that never
 * went through search_products (e.g. "tell me about the wooden chair") --
 * pulls fresh name/price/image by id for whatever PRODUCT chunks the RAG
 * retrieval surfaced, rather than trusting the embedded chunk's own
 * (possibly stale) metadata. */
export async function getProductCardsByIds(productIds: string[]): Promise<ProductCard[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { name: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
        take: 1,
        select: { url: true },
      },
      variants: {
        where: { isActive: true },
        select: { price: true, stock: true },
      },
    },
  });

  return products.map((product) => {
    const prices = product.variants.map((v) => Number(v.price));
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      category: product.category.name,
      price: prices.length > 0 ? Math.min(...prices) : 0,
      inStock: totalStock > 0,
      imageUrl: product.images[0]?.url ?? null,
    };
  });
}
