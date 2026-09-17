"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import Alert from "@/components/ui/alert";
import { useAlert } from "@/hooks/use-alert";
import { notifyCartUpdated } from "@/lib/cart-events";

type ReorderItem = {
  id: string;
  productName: string;
  colorName: string | null;
  sizeName: string | null;
  quantity: number;
  image: { url: string; altText: string | null } | null;
  availability: {
    variantId: string | null;
    available: boolean;
    stock: number;
    inCartQuantity: number;
  };
};

export default function ReorderPanel({ items }: { items: ReorderItem[] }) {
  const { alert, showAlert, closeAlert } = useAlert();

  // Source of truth is what's actually in the cart, not "did I click this
  // button before" — that's what let a page revisit show a blank "Add to
  // cart" button and pile more of the same variant on every click. Seeded
  // from the live DB read in getUserOrderById, then updated optimistically
  // to match what the server just did on each successful add.
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>(
    () =>
      Object.fromEntries(
        items
          .filter((item) => item.availability.variantId)
          .map((item) => [item.availability.variantId as string, item.availability.inCartQuantity]),
      ),
  );
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  if (items.length === 0) {
    return null;
  }

  function targetQty(item: ReorderItem) {
    return Math.min(item.quantity, item.availability.stock);
  }

  function remainingToAdd(item: ReorderItem) {
    if (!item.availability.available || !item.availability.variantId) {
      return 0;
    }
    const inCart = cartQuantities[item.availability.variantId] ?? 0;
    return Math.max(0, targetQty(item) - inCart);
  }

  const reorderable = items.filter((item) => remainingToAdd(item) > 0);
  const anyInCart = items.some(
    (item) => (cartQuantities[item.availability.variantId ?? ""] ?? 0) > 0,
  );

  async function addItem(item: ReorderItem, qty: number) {
    const variantId = item.availability.variantId;
    if (!variantId || qty <= 0) {
      return false;
    }

    setBusyIds((current) => new Set(current).add(item.id));

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: qty }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showAlert(result.message ?? `Unable to add ${item.productName} to cart.`, {
          variant: "error",
        });
        return false;
      }

      setCartQuantities((current) => ({
        ...current,
        [variantId]: (current[variantId] ?? 0) + qty,
      }));
      return true;
    } catch (error) {
      console.error("Reorder add-to-cart error:", error);
      showAlert(`Unable to add ${item.productName} to cart.`, { variant: "error" });
      return false;
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleAddOne(item: ReorderItem) {
    const qty = remainingToAdd(item);
    const added = await addItem(item, qty);

    if (!added) {
      return;
    }

    notifyCartUpdated();
    showAlert(
      qty < item.quantity
        ? `Added ${qty} of ${item.productName} to your cart — only ${qty} left in stock.`
        : `${item.productName} added to your cart.`,
      { variant: "success" },
    );
  }

  async function handleAddAll() {
    setBulkBusy(true);

    let addedCount = 0;
    for (const item of reorderable) {
      const qty = remainingToAdd(item);
      if (qty <= 0) {
        continue;
      }
      const added = await addItem(item, qty);
      if (added) {
        addedCount += 1;
      }
    }

    setBulkBusy(false);

    if (addedCount === 0) {
      showAlert("No items could be added to your cart.", { variant: "warning" });
      return;
    }

    notifyCartUpdated();

    const skipped = items.filter((item) => !item.availability.available).length;
    showAlert(
      skipped > 0
        ? `Added ${addedCount} item(s) to your cart. ${skipped} item(s) are no longer available.`
        : `Added ${addedCount} item(s) to your cart.`,
      { variant: "success" },
    );
  }

  return (
    <section className="mt-6">
      {alert ? (
        <Alert message={alert.message} variant={alert.variant} onClose={closeAlert} />
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Reorder these items</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            This order was cancelled. Availability below is checked live.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {anyInCart ? (
            <Link
              href="/cart"
              className="text-xs font-semibold text-[#087ff5] hover:underline"
            >
              View cart →
            </Link>
          ) : null}

          {reorderable.length > 0 ? (
            <button
              type="button"
              onClick={handleAddAll}
              disabled={bulkBusy}
              className="inline-flex h-8 items-center rounded-md bg-[#087ff5] px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
            >
              {bulkBusy ? "Adding..." : `Add all available (${reorderable.length})`}
            </button>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
        {items.map((item) => {
          const busy = busyIds.has(item.id);
          const inCart = cartQuantities[item.availability.variantId ?? ""] ?? 0;
          const remaining = remainingToAdd(item);
          const fullyInCart = item.availability.available && inCart > 0 && remaining === 0;
          const capped =
            item.availability.available && item.availability.stock < item.quantity;

          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100">
                {item.image ? (
                  <Image
                    src={item.image.url}
                    alt={item.image.altText ?? item.productName}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[8px] leading-3 text-gray-400">
                    No image
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-800">
                  {item.productName}
                </p>
                <p className="mt-0.5 text-[10px] text-gray-400">
                  {[item.colorName, item.sizeName].filter(Boolean).join(" · ")}
                  {item.colorName || item.sizeName ? " · " : ""}
                  Qty {item.quantity}
                </p>
                {!item.availability.available ? (
                  <p className="mt-0.5 text-[10px] font-medium text-red-500">
                    Out of stock
                  </p>
                ) : capped ? (
                  <p className="mt-0.5 text-[10px] font-medium text-amber-600">
                    Only {item.availability.stock} left in stock
                    {inCart > 0 ? ` — ${inCart} already in your cart` : ""}
                  </p>
                ) : inCart > 0 ? (
                  <p className="mt-0.5 text-[10px] font-medium text-green-600">
                    {inCart} in your cart
                  </p>
                ) : null}
              </div>

              <div className="shrink-0">
                {!item.availability.available ? (
                  <span className="inline-flex h-8 items-center rounded-md bg-gray-100 px-3 text-[11px] font-medium text-gray-400">
                    Unavailable
                  </span>
                ) : fullyInCart ? (
                  <span className="inline-flex h-8 items-center rounded-md bg-green-50 px-3 text-[11px] font-semibold text-green-700">
                    In cart ✓
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddOne(item)}
                    disabled={busy}
                    className="inline-flex h-8 items-center rounded-md border border-[#087ff5] px-3 text-[11px] font-semibold text-[#087ff5] transition hover:bg-blue-50 disabled:border-gray-200 disabled:text-gray-400"
                  >
                    {busy
                      ? "Adding..."
                      : inCart > 0
                        ? `Add ${remaining} more`
                        : "Add to cart"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
