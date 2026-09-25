import type { FunctionDeclaration } from "@google/genai";

import { prisma } from "@/lib/prisma";
import { getAdminOrders } from "@/lib/services/admin-order.service";

/** Admin-tier tools: mostly read-only store-wide aggregates, plus one
 * guarded write (update_order_status). No destructive or money-moving
 * actions exist here at all -- no cancel, no refund, no edit -- and
 * update_order_status can only step an order forward one stage at a time
 * (enforced by the real PATCH /api/admin/orders/[id] endpoint it calls,
 * not re-implemented here). Read tools avoid returning customer PII beyond
 * what's needed for an admin to identify an order (name only, no email
 * unless already part of that data, no address/phone).
 *
 * Auditability: every call an admin's chat session makes through these
 * tools is already persisted on ChatMessage.toolCalls (see route.ts),
 * scoped to that admin's own userId via ChatSession -- a plain SQL query
 * against ChatMessage/ChatSession is the audit log; no separate table was
 * added for this since one already fits. */
export const ADMIN_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "get_sales_summary",
    description:
      "Revenue and order-count summary over a recent time window, paid orders only. Use for questions like 'how are sales this week' or 'what's our revenue this month'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "How many days back to summarize. Default 7, max 365.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_low_stock",
    description:
      "Lists active product variants at or below a stock threshold, lowest stock first. Use for questions like 'what's running low' or 'what needs restocking'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        threshold: {
          type: "integer",
          description: "Stock level at or below which a variant counts as low. Default 5.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_failed_payments",
    description:
      "Lists recent failed payment attempts: order number, amount, failure reason. Use for questions like 'any failed payments recently' or 'what's failing at checkout'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        days: {
          type: "integer",
          description: "How many days back to check. Default 7, max 90.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_orders",
    description:
      "Searches orders by order number, customer name, or email, optionally filtered by status. Use this to find a specific order (e.g. before updating its status) or answer 'find orders from...' style questions.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Order number, customer name, or email to search for." },
        status: {
          type: "string",
          enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"],
          description: "Optional: only orders in this status.",
        },
        limit: { type: "integer", description: "Max results. Default 5, max 15." },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_order_status",
    description:
      "Advances one order to the next stage in its lifecycle: PENDING -> PROCESSING -> SHIPPED -> DELIVERED, one step at a time, in that order only. There is no way to cancel or refund an order through this tool -- if asked to do either, say plainly that you cannot and that it needs to be handled outside chat. Use for requests like 'mark order BV-1042 as shipped'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        orderNumber: { type: "string", description: "The order number to update." },
        status: {
          type: "string",
          enum: ["PROCESSING", "SHIPPED", "DELIVERED"],
          description: "The new status to move the order to.",
        },
      },
      required: ["orderNumber", "status"],
      additionalProperties: false,
    },
  },
];

function clampInt(value: unknown, fallback: number, max: number, min = 1): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function runAdminTool(
  name: string,
  args: Record<string, unknown>,
  cookieHeader: string | null,
): Promise<Record<string, unknown>> {
  switch (name) {
    case "get_sales_summary": {
      const days = clampInt(args.days, 7, 365);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [paid, byStatus] = await Promise.all([
        prisma.order.aggregate({
          where: { createdAt: { gte: since }, paymentStatus: "PAID" },
          _sum: { total: true },
          _count: true,
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: { createdAt: { gte: since } },
          _count: true,
        }),
      ]);

      return {
        windowDays: days,
        paidOrders: paid._count,
        revenue: Number(paid._sum.total ?? 0),
        ordersByStatus: Object.fromEntries(
          byStatus.map((row) => [row.status, row._count]),
        ),
      };
    }

    case "get_low_stock": {
      const threshold = clampInt(args.threshold, 5, 1000, 0);

      const variants = await prisma.productVariant.findMany({
        where: {
          isActive: true,
          stock: { lte: threshold },
          product: { isActive: true },
        },
        select: {
          sku: true,
          stock: true,
          product: { select: { name: true } },
          color: { select: { name: true } },
          size: { select: { name: true } },
        },
        orderBy: { stock: "asc" },
        take: 20,
      });

      return {
        threshold,
        count: variants.length,
        variants: variants.map((variant) => ({
          product: variant.product.name,
          sku: variant.sku,
          color: variant.color?.name ?? null,
          size: variant.size?.name ?? null,
          stock: variant.stock,
        })),
      };
    }

    case "get_failed_payments": {
      const days = clampInt(args.days, 7, 90);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const attempts = await prisma.paymentAttempt.findMany({
        where: { status: "FAILED", createdAt: { gte: since } },
        select: {
          amount: true,
          currency: true,
          failureCode: true,
          createdAt: true,
          order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return {
        windowDays: days,
        count: attempts.length,
        attempts: attempts.map((attempt) => ({
          orderNumber: attempt.order.orderNumber,
          amount: Number(attempt.amount),
          currency: attempt.currency,
          failureCode: attempt.failureCode,
          attemptedAt: attempt.createdAt,
        })),
      };
    }

    case "search_orders": {
      const query = typeof args.query === "string" ? args.query.trim() : "";
      const status = typeof args.status === "string" ? args.status : "";
      const limit = clampInt(args.limit, 5, 15);

      const { orders } = await getAdminOrders({ search: query, status, page: 1, pageSize: limit });

      return {
        count: orders.length,
        orders: orders.map((order) => ({
          orderNumber: order.orderNumber,
          customerName: order.customer.fullName,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          itemCount: order.itemCount,
          placedAt: order.createdAt,
        })),
      };
    }

    case "update_order_status": {
      const orderNumber = typeof args.orderNumber === "string" ? args.orderNumber.trim() : "";
      const status = args.status;

      if (!orderNumber) {
        return { error: "orderNumber is required." };
      }
      if (status !== "PROCESSING" && status !== "SHIPPED" && status !== "DELIVERED") {
        return { error: "status must be one of PROCESSING, SHIPPED, DELIVERED." };
      }

      const order = await prisma.order.findFirst({ where: { orderNumber }, select: { id: true } });
      if (!order) {
        return { error: `No order found with number ${orderNumber}.` };
      }

      // Reuses the real PATCH /api/admin/orders/[id] endpoint rather than
      // reimplementing it -- that endpoint already handles the allowed-
      // transition check, a concurrency-safe conditional update, and the
      // customer notification, all in one transaction. Duplicating that
      // here would just be a second copy to keep in sync. Runs as the
      // requesting admin's own session (their cookie is forwarded), so
      // this can only ever do what that admin's own account is allowed to.
      const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify({ status }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        return { error: result?.message ?? "Unable to update that order's status." };
      }

      return { updated: true, orderNumber, newStatus: status };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
