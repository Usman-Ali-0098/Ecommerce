import type { FunctionDeclaration } from "@google/genai";

import { prisma } from "@/lib/prisma";

/** Admin-tier tools: read-only, store-wide aggregates. No destructive
 * actions (no refund/cancel/edit) and no per-customer PII (no names,
 * emails, addresses) -- matching the plan's "read-heavy analytics tools"
 * scope for this tier; guarded write actions are a deliberately separate,
 * later addition per the roadmap.
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
];

function clampInt(value: unknown, fallback: number, max: number, min = 1): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function runAdminTool(
  name: string,
  args: Record<string, unknown>,
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

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
