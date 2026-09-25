import type { FunctionDeclaration } from "@google/genai";

import { prisma } from "@/lib/prisma";
import { getUserCart } from "@/lib/services/cart.service";
import { getUserOrders } from "@/lib/services/order.service";

/** Tools available to an authenticated USER-tier chat session. Every
 * implementation below is scoped to `userId` taken from the caller's
 * authenticated session (see src/app/api/chat/route.ts) -- never from
 * anything the model supplies in a function call's arguments. The model
 * can only ever ask for "my orders" / "my cart"; there is no `userId`
 * parameter it could populate to request someone else's data. This is the
 * enforcement point the plan calls "role-aware access enforced at the tool
 * layer" -- the system prompt asking the model to behave is a courtesy,
 * this is the actual guarantee. */
export const USER_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_my_orders",
    description:
      "Lists the signed-in customer's most recent orders: order number, status, payment status, total, and item count. Use this for general questions like 'what have I ordered' or 'show my recent orders'.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "get_order_status",
    description:
      "Looks up one specific order by its order number for the signed-in customer: status, payment status, total, and line items. Use this when they ask about a specific order, e.g. 'where is order BV-1042'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        orderNumber: {
          type: "string",
          description: "The order number to look up, e.g. BV-1042.",
        },
      },
      required: ["orderNumber"],
      additionalProperties: false,
    },
  },
  {
    name: "get_my_cart",
    description:
      "Returns the signed-in customer's current shopping cart: items, quantities, and subtotal. Use this when they ask what's in their cart.",
    parametersJsonSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "add_to_cart",
    description:
      "Adds one product variant to the signed-in customer's cart. You must already have the exact variantId -- call get_product_variants first if you don't (e.g. the customer named a color/size but you've only seen the product, not its variants). This only adds to cart; it never places an order or charges anything -- after adding, tell the customer their item is in the cart and they can review and check out whenever they're ready.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        variantId: { type: "string", description: "The exact variant id from get_product_variants." },
        quantity: { type: "integer", description: "How many to add. Default 1." },
      },
      required: ["variantId"],
      additionalProperties: false,
    },
  },
];

function clampQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), 20);
}

export async function runUserTool(
  name: string,
  args: Record<string, unknown>,
  userId: number,
  cookieHeader: string | null,
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_my_orders": {
      const { orders } = await getUserOrders({ userId, page: 1, pageSize: 5 });

      return {
        orders: orders.map((order) => ({
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          productCount: order.productCount,
          placedAt: order.createdAt,
        })),
      };
    }

    case "get_order_status": {
      const orderNumber = String(args.orderNumber ?? "").trim();

      if (!orderNumber) {
        return { error: "orderNumber is required." };
      }

      // Deliberately not reusing order.service.ts's getUserOrderById here --
      // that function returns full shipping address/phone/email and image
      // URLs for the order-detail page, far more than a chat answer needs.
      // This pulls only what's useful to say out loud, keeping PII like the
      // shipping address out of the prompt sent to Gemini.
      const order = await prisma.order.findFirst({
        where: { userId, orderNumber },
        select: {
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          items: { select: { productName: true, quantity: true } },
        },
      });

      if (!order) {
        return { error: `No order found with number ${orderNumber} on this account.` };
      }

      return {
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        placedAt: order.createdAt,
        items: order.items.map((item) => ({
          product: item.productName,
          quantity: item.quantity,
        })),
      };
    }

    case "get_my_cart": {
      const cart = await getUserCart(userId);

      return {
        totalItems: cart.totalItems,
        subtotal: cart.subtotal,
        items: cart.items.map((item) => ({
          product: item.product.name,
          color: item.variant.color?.name ?? null,
          size: item.variant.size?.name ?? null,
          quantity: item.quantity,
          unitPrice: item.variant.price,
          lineTotal: item.lineTotal,
        })),
      };
    }

    case "add_to_cart": {
      const variantId = typeof args.variantId === "string" ? args.variantId.trim() : "";
      const quantity = clampQuantity(args.quantity);

      if (!variantId) {
        return { error: "variantId is required." };
      }

      // Deliberately reuses the real POST /api/cart endpoint rather than
      // reimplementing its stock/availability checks and cart/cartItem
      // upsert logic here -- that logic is already correct and tested; a
      // second, chat-only copy of it would just be a second place for the
      // two to quietly drift apart. Runs as the signed-in customer's own
      // session (their cookie is forwarded), so it can only ever act on
      // their own cart -- same guarantee as every other tool here.
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ variantId, quantity }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        return { error: result?.message ?? "Unable to add that item to the cart." };
      }

      return {
        added: true,
        quantity: result.data.cartItem.quantity,
        remainingStock: result.data.stock,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
