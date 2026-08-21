"use client";

import { useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import Alert from "@/components/ui/alert";

import { useAlert } from "@/hooks/use-alert";

import CartSummary from "@/components/cart/cart-summary";
import CartTable from "@/components/cart/cart-table";
import DeleteCartItemModal from "@/components/cart/delete-cart-item-modal";

import OrderSuccessModal from "@/components/orders/order-success-modal";

import { notifyCartUpdated } from "@/lib/cart-events";

import { notifyNotificationUpdated } from "@/lib/notification-events";

import type { CartData, CartItemData } from "@/types/cart";

type CartClientProps = {
  cart: CartData;
};

type PlaceOrderResponse = {
  success: boolean;

  message?: string;

  data?: {
    id: string;

    orderNumber: string;

    status: string;

    subtotal: number;

    tax: number;

    total: number;
  };
};

type UpdateQuantityResponse = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    quantity: number;
    stock: number;
    unitPrice: number;
    lineTotal: number;
  };
};

export default function CartClient({ cart }: CartClientProps) {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const [displayedItems, setDisplayedItems] = useState<CartItemData[]>(
    cart.items,
  );

  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const [updatingItemIds, setUpdatingItemIds] = useState<string[]>([]);

  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [itemPendingDelete, setItemPendingDelete] = useState<string | null>(
    null,
  );

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  //ORDER SUCCESS

  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(
    null,
  );

  // SELECTED CART ITEMS

  const selectedItems = useMemo(
    () =>
      displayedItems.filter((item) => selectedItemIds.includes(item.id)),
    [displayedItems, selectedItemIds],
  );

  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((total, item) => total + item.lineTotal, 0),
    [selectedItems],
  );

  const allSelected =
    displayedItems.length > 0 && selectedItemIds.length === displayedItems.length;

  // SELECTION

  function toggleItem(itemId: string) {
    setSelectedItemIds((current) => {
      if (current.includes(itemId)) {
        return current.filter((id) => id !== itemId);
      }

      return [...current, itemId];
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedItemIds([]);

      return;
    }

    setSelectedItemIds(displayedItems.map((item) => item.id));
  }

  // UPDATE QUANTITY

  async function updateQuantity(itemId: string, quantity: number) {
    if (quantity < 1 || updatingItemIds.includes(itemId)) {
      return;
    }

    const confirmedItem = displayedItems.find((item) => item.id === itemId);

    if (!confirmedItem || quantity > confirmedItem.variant.stock) {
      return;
    }

    const confirmedQuantity = confirmedItem.quantity;
    const confirmedLineTotal = confirmedItem.lineTotal;

    setDisplayedItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity,
              lineTotal: item.variant.price * quantity,
            }
          : item,
      ),
    );

    try {
      setUpdatingItemIds((current) => [...current, itemId]);

      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          quantity,
        }),
      });

      const result = (await response.json()) as UpdateQuantityResponse;

      if (!response.ok || !result.success || !result.data) {
        setDisplayedItems((current) =>
          current.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: confirmedQuantity,
                  lineTotal: confirmedLineTotal,
                }
              : item,
          ),
        );

        showAlert(result.message ?? "Unable to update quantity.", {
          variant: "error",
        });

        // Re-read current stock when the server rejects a stale quantity.
        router.refresh();

        return;
      }

      setDisplayedItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: result.data!.quantity,
                lineTotal: result.data!.lineTotal,
                variant: {
                  ...item.variant,
                  price: result.data!.unitPrice,
                  stock: result.data!.stock,
                },
              }
            : item,
        ),
      );

      showAlert(result.message ?? "Cart quantity updated.", {
        variant: "success",
      });
    } catch (error) {
      console.error("Update quantity error:", error);

      setDisplayedItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantity: confirmedQuantity,
                lineTotal: confirmedLineTotal,
              }
            : item,
        ),
      );

      showAlert("Something went wrong while updating quantity.", {
        variant: "error",
      });
    } finally {
      setUpdatingItemIds((current) => current.filter((id) => id !== itemId));
    }
  }

  // DELETE CART ITEM

  function requestDelete(itemId: string) {
    setItemPendingDelete(itemId);
  }

  function cancelDelete() {
    if (deletingItemId) {
      return;
    }

    setItemPendingDelete(null);
  }

  async function confirmDelete() {
    if (!itemPendingDelete) {
      return;
    }

    const itemId = itemPendingDelete;

    try {
      setDeletingItemId(itemId);

      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to remove product.", {
          variant: "error",
        });

        return;
      }

      setSelectedItemIds((current) => current.filter((id) => id !== itemId));

      setItemPendingDelete(null);

      showAlert(result.message ?? "Product removed from cart.", {
        variant: "success",
      });

      notifyCartUpdated();

      router.refresh();
    } catch (error) {
      console.error("Delete cart item error:", error);

      showAlert("Something went wrong while removing the product.", {
        variant: "error",
      });
    } finally {
      setDeletingItemId(null);
    }
  }

  // / PLACE ORDER

  async function placeOrder() {
    if (selectedItemIds.length === 0) {
      showAlert("Please select at least one product.", {
        variant: "warning",
      });

      return;
    }

    try {
      setIsPlacingOrder(true);

      const response = await fetch("/api/orders", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          cartItemIds: selectedItemIds,
        }),
      });

      /*
       * Read response once.
       */
      const result = (await response.json()) as PlaceOrderResponse;

      if (!response.ok || !result.success || !result.data) {
        showAlert(result.message ?? "Unable to place order.", {
          variant: "error",
        });

        return;
      }

      //ORDER SUCCESS

      setPlacedOrderId(result.data.id);

      setPlacedOrderNumber(result.data.orderNumber);

      setSelectedItemIds([]);

      /*
       * Update header/cart/notification
       * UI after successful checkout.
       */

      notifyCartUpdated();

      notifyNotificationUpdated();

      router.refresh();
    } catch (error) {
      console.error("Place order request error:", error);

      showAlert("Something went wrong while placing the order.", {
        variant: "error",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  }

  //SUCCESS MODAL NAVIGATION

  function viewPlacedOrder() {
    if (!placedOrderId) {
      return;
    }

    router.push(`/orders/${placedOrderId}`);
  }

  function returnHome() {
    router.push("/");
  }

  return (
    <>
      <CartTable
        items={displayedItems}
        selectedItemIds={selectedItemIds}
        allSelected={allSelected}
        updatingItemIds={updatingItemIds}
        deletingItemId={deletingItemId}
        onToggleItem={toggleItem}
        onToggleAll={toggleAll}
        onUpdateQuantity={updateQuantity}
        onDeleteItem={requestDelete}
      />

      <CartSummary
        subtotal={selectedSubtotal}
        selectedCount={selectedItems.length}
        isPlacingOrder={isPlacingOrder}
        onPlaceOrder={placeOrder}
      />

      <DeleteCartItemModal
        open={itemPendingDelete !== null}
        isDeleting={deletingItemId !== null}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />

      {/* Order Success Modal */}

      <OrderSuccessModal
        open={placedOrderId !== null}
        orderNumber={placedOrderNumber}
        onViewOrder={viewPlacedOrder}
        onReturnHome={returnHome}
      />

      {alert ? (
        <Alert
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}
    </>
  );
}
