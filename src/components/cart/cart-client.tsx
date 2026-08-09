"use client";

import {
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Alert from "@/components/ui/alert";
import { useAlert } from "@/hooks/use-alert";

import CartSummary from "@/components/cart/cart-summary";
import CartTable from "@/components/cart/cart-table";
import DeleteCartItemModal from "@/components/cart/delete-cart-item-modal";

import { notifyCartUpdated } from "@/lib/cart-events";
import { notifyNotificationUpdated } from "@/lib/notification-events";

import type { CartData } from "@/types/cart";

type CartClientProps = {
  cart: CartData;
};

export default function CartClient({
  cart,
}: CartClientProps) {
  const router = useRouter();

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  /*
   * Nothing selected when
   * cart initially opens.
   */
  const [
    selectedItemIds,
    setSelectedItemIds,
  ] = useState<string[]>([]);

  const [
    updatingItemId,
    setUpdatingItemId,
  ] = useState<string | null>(
    null
  );

  const [
    deletingItemId,
    setDeletingItemId,
  ] = useState<string | null>(
    null
  );

  const [
    itemPendingDelete,
    setItemPendingDelete,
  ] = useState<string | null>(
    null
  );

  const [
    isPlacingOrder,
    setIsPlacingOrder,
  ] = useState(false);

  const selectedItems =
    useMemo(
      () =>
        cart.items.filter(
          (item) =>
            selectedItemIds.includes(
              item.id
            )
        ),
      [
        cart.items,
        selectedItemIds,
      ]
    );

  const selectedSubtotal =
    useMemo(
      () =>
        selectedItems.reduce(
          (
            total,
            item
          ) =>
            total +
            item.lineTotal,
          0
        ),
      [selectedItems]
    );

  const allSelected =
    cart.items.length > 0 &&
    selectedItemIds.length ===
      cart.items.length;

  function toggleItem(
    itemId: string
  ) {
    setSelectedItemIds(
      (current) => {
        if (
          current.includes(
            itemId
          )
        ) {
          return current.filter(
            (id) =>
              id !== itemId
          );
        }

        return [
          ...current,
          itemId,
        ];
      }
    );
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedItemIds([]);
      return;
    }

    setSelectedItemIds(
      cart.items.map(
        (item) => item.id
      )
    );
  }

  async function updateQuantity(
    itemId: string,
    quantity: number
  ) {
    if (quantity < 1) {
      return;
    }

    try {
      setUpdatingItemId(
        itemId
      );

      const response =
        await fetch(
          `/api/cart/items/${itemId}`,
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                quantity,
              }
            ),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        showAlert(
          result.message ??
            "Unable to update quantity.",
          "error"
        );

        return;
      }

      showAlert(
        result.message ??
          "Cart quantity updated.",
        "success"
      );

      /*
       * Tell header:
       * cart quantity changed.
       */
      notifyCartUpdated();

      router.refresh();
    } catch (error) {
      console.error(
        "Update quantity error:",
        error
      );

      showAlert(
        "Something went wrong while updating quantity.",
        "error"
      );
    } finally {
      setUpdatingItemId(
        null
      );
    }
  }

  function requestDelete(
    itemId: string
  ) {
    setItemPendingDelete(
      itemId
    );
  }

  function cancelDelete() {
    if (deletingItemId) {
      return;
    }

    setItemPendingDelete(
      null
    );
  }

  async function confirmDelete() {
    if (!itemPendingDelete) {
      return;
    }

    const itemId =
      itemPendingDelete;

    try {
      setDeletingItemId(
        itemId
      );

      const response =
        await fetch(
          `/api/cart/items/${itemId}`,
          {
            method:
              "DELETE",
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        showAlert(
          result.message ??
            "Unable to remove product.",
          "error"
        );

        return;
      }

      setSelectedItemIds(
        (current) =>
          current.filter(
            (id) =>
              id !== itemId
          )
      );

      setItemPendingDelete(
        null
      );

      showAlert(
        result.message ??
          "Product removed from cart.",
        "success"
      );

      /*
       * Update header badge.
       */
      notifyCartUpdated();

      router.refresh();
    } catch (error) {
      console.error(
        "Delete cart item error:",
        error
      );

      showAlert(
        "Something went wrong while removing the product.",
        "error"
      );
    } finally {
      setDeletingItemId(
        null
      );
    }
  }

  async function placeOrder() {
  if (selectedItemIds.length === 0) {
    showAlert(
      "Please select at least one product.",
      "warning"
    );

    return;
  }

  try {
    setIsPlacingOrder(true);

    const response = await fetch(
      "/api/orders",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          cartItemIds:
            selectedItemIds,
        }),
      }
    );

    if (!response.ok) {
      const result =
        await response.json();

      showAlert(
        result.message ??
          "Unable to place order.",
        "error"
      );

      return;
    }

    const result =
      await response.json();

    showAlert(
      result.message ??
        "Order placed successfully.",
      "success"
    );

    setSelectedItemIds([]);

    /*
     * Order API has:
     * - removed ordered cart items
     * - created a new unread notification
     */
    notifyCartUpdated();
    notifyNotificationUpdated();

    router.refresh();

    router.push("/orders");
  } catch (error) {
    console.error(
      "Place order request error:",
      error
    );

    showAlert(
      "Something went wrong while placing the order.",
      "error"
    );
  } finally {
    setIsPlacingOrder(false);
  }
}

  return (
    <>
      <CartTable
        cart={cart}
        selectedItemIds={
          selectedItemIds
        }
        allSelected={
          allSelected
        }
        updatingItemId={
          updatingItemId
        }
        deletingItemId={
          deletingItemId
        }
        onToggleItem={
          toggleItem
        }
        onToggleAll={
          toggleAll
        }
        onUpdateQuantity={
          updateQuantity
        }
        onDeleteItem={
          requestDelete
        }
      />

      <CartSummary
        subtotal={
          selectedSubtotal
        }
        selectedCount={
          selectedItems.length
        }
        isPlacingOrder={
          isPlacingOrder
        }
        onPlaceOrder={
          placeOrder
        }
      />

      <DeleteCartItemModal
        open={
          itemPendingDelete !==
          null
        }
        isDeleting={
          deletingItemId !==
          null
        }
        onCancel={
          cancelDelete
        }
        onConfirm={
          confirmDelete
        }
      />

      {alert ? (
        <Alert
          message={
            alert.message
          }
          variant={
            alert.variant
          }
          onClose={
            closeAlert
          }
        />
      ) : null}
    </>
  );
}