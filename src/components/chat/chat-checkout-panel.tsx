"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

import CheckoutForm, {
  type OrderConfirmedResult,
  type OrderFailedResult,
} from "@/components/payments/checkout-form";

type Shipping = {
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

type CheckoutData =
  | { mode: "fresh"; cartItemIds: string[]; total: number }
  | { mode: "resume"; orderId: string; orderNumber: string; total: number; shipping: Shipping };

const DEFAULT_SHIPPING: Shipping = {
  shippingName: "",
  shippingEmail: "",
  shippingPhone: "",
  shippingAddress: "",
  shippingCity: "",
  shippingPostalCode: "",
  shippingCountry: "Pakistan",
};

/** Mounts the site's own <CheckoutForm> -- the same component /checkout
 * renders -- inside the chat widget. Nothing about the checkout logic
 * itself is reimplemented here: delivery form, payment-method choice,
 * Stripe card entry, and COD placement are all the existing,
 * already-tested component, just embedded instead of on a full page.
 *
 * Two modes:
 * - Fresh (resumeOrderId absent): scoped to chatCartItemIds -- only what
 *   the customer added *through this conversation*, not their whole real
 *   cart. See GET /api/cart's `itemIds` filter, which does this scoping
 *   server-side so the tax math stays in one place.
 * - Resume (resumeOrderId given): a previous card payment from this widget
 *   failed. Reuses the exact data /checkout/[sessionId]'s retry page
 *   fetches server-side (shipping already on file, jump straight to
 *   payment) via GET /api/orders/[orderId]/checkout.
 *
 * A completed (or failed) order here does NOT navigate the browser, and
 * a failed card payment does NOT pop the full-page PaymentFailedModal --
 * ChatWidget is mounted at the root layout, outside the routed page tree
 * and animated with a CSS transform, so both a route change and a `fixed`
 * modal from inside this panel behave wrong (the modal, specifically,
 * becomes trapped inside the widget's own transformed box instead of
 * covering the viewport). onOrderConfirmed/onOrderFailed tell
 * <CheckoutForm> to hand the result back instead; the caller
 * (chat-widget.tsx) shows it as a chat message and keeps the customer on
 * whatever page they were actually on. */
export default function ChatCheckoutPanel({
  onBack,
  onOrderConfirmed,
  onOrderFailed,
  chatCartItemIds,
  resumeOrderId,
}: {
  onBack: () => void;
  onOrderConfirmed: (result: OrderConfirmedResult) => void;
  onOrderFailed: (failure: OrderFailedResult) => void;
  chatCartItemIds: string[];
  resumeOrderId: string | null;
}) {
  const { data: session } = useSession();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Whether there's anything to fetch at all is already known synchronously
  // from props at mount time (view === "checkout" always flips from
  // "chat", so this component gets a fresh mount -- and fresh state --
  // every time resumeOrderId/chatCartItemIds actually change; see
  // chat-widget.tsx). Seeding loading from that avoids ever needing to
  // reset state imperatively inside the effect below.
  const [loading, setLoading] = useState(() => Boolean(resumeOrderId) || chatCartItemIds.length > 0);

  useEffect(() => {
    if (!resumeOrderId && chatCartItemIds.length === 0) return;

    let cancelled = false;

    if (resumeOrderId) {
      fetch(`/api/orders/${encodeURIComponent(resumeOrderId)}/checkout`)
        .then((response) => response.json())
        .then((body) => {
          if (cancelled) return;
          if (!body.success) {
            setError(body.message ?? "This order can no longer be retried.");
            return;
          }
          setData({
            mode: "resume",
            orderId: body.data.orderId,
            orderNumber: body.data.orderNumber,
            total: body.data.total,
            shipping: body.data.shipping,
          });
        })
        .catch(() => {
          if (!cancelled) setError("Unable to load this order.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }

    const query = chatCartItemIds.map(encodeURIComponent).join(",");
    fetch(`/api/cart?itemIds=${query}`)
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.success) {
          setError(body.message ?? "Unable to load your cart.");
          return;
        }
        setData({ mode: "fresh", cartItemIds: body.data.cartItemIds, total: body.data.total });
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load your cart.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // chatCartItemIds compared by content, not array identity, so this
    // doesn't re-fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOrderId, chatCartItemIds.join(",")]);

  const isEmptyFreshCart = data?.mode === "fresh" && data.cartItemIds.length === 0;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-[11.5px] font-medium text-[#087ff5] hover:underline"
      >
        &larr; Back to chat
      </button>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-300">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error || !data || isEmptyFreshCart ? (
        <p className="px-1 py-6 text-center text-[12.5px] text-gray-500">
          {error ?? "Your cart is empty."}
        </p>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          {data.mode === "fresh" ? (
            <CheckoutForm
              cartItemIds={data.cartItemIds}
              total={data.total}
              publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              shipping={{
                ...DEFAULT_SHIPPING,
                shippingName: session?.user?.fullName ?? "",
                shippingEmail: session?.user?.email ?? "",
              }}
              onOrderConfirmed={onOrderConfirmed}
              onOrderFailed={onOrderFailed}
            />
          ) : (
            <CheckoutForm
              orderId={data.orderId}
              orderNumber={data.orderNumber}
              total={data.total}
              publishableKey={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              shipping={data.shipping}
              onOrderConfirmed={onOrderConfirmed}
              onOrderFailed={onOrderFailed}
            />
          )}
        </div>
      )}
    </div>
  );
}
