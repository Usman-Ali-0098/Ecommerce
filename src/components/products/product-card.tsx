"use client";

import Image from "next/image";

import {
  useMemo,
  useState,
} from "react";

import {
  useSession,
} from "next-auth/react";

import Alert from "@/components/ui/alert";

import {
  useAlert,
} from "@/hooks/use-alert";

import {
  notifyCartUpdated,
} from "@/lib/cart-events";

import type {
  PublicProduct,
  PublicProductVariant,
} from "@/types/product";

type ProductCardProps = {
  product: PublicProduct;
};

export default function ProductCard({
  product,
}: ProductCardProps) {
  const {
    data: session,
    status,
  } = useSession();

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  /*
   * --------------------------------
   * COLORS
   * --------------------------------
   */

  const colors =
    useMemo(() => {
      const uniqueColors =
        new Map<
          string,
          NonNullable<
            PublicProductVariant["color"]
          >
        >();

      product.variants.forEach(
        (variant) => {
          if (
            variant.color
          ) {
            uniqueColors.set(
              variant.color.id,
              variant.color
            );
          }
        }
      );

      return Array.from(
        uniqueColors.values()
      );
    }, [product.variants]);

  /*
   * --------------------------------
   * SIZES
   * --------------------------------
   */

  const sizes =
    useMemo(() => {
      const uniqueSizes =
        new Map<
          string,
          NonNullable<
            PublicProductVariant["size"]
          >
        >();

      product.variants.forEach(
        (variant) => {
          if (
            variant.size
          ) {
            uniqueSizes.set(
              variant.size.id,
              variant.size
            );
          }
        }
      );

      return Array.from(
        uniqueSizes.values()
      ).sort(
        (a, b) =>
          a.sortOrder -
          b.sortOrder
      );
    }, [product.variants]);

  /*
   * --------------------------------
   * STATE
   * --------------------------------
   */

  const [
    selectedSizeId,
    setSelectedSizeId,
  ] = useState("");

  const [
    selectedColorId,
    setSelectedColorId,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState(1);

  const [
    isAdding,
    setIsAdding,
  ] = useState(false);

  /*
   * --------------------------------
   * SELECTED VARIANT
   * --------------------------------
   */

  const selectedVariant =
    findVariant({
      variants:
        product.variants,

      sizeId:
        selectedSizeId,

      colorId:
        selectedColorId,
    });

  const displayPrice =
    selectedVariant?.price ??
    product.minPrice;

  const availableStock =
    selectedVariant?.stock ??
    product.totalStock;

  const isOutOfStock =
    product.totalStock <= 0 ||
    (selectedVariant
      ? selectedVariant.stock <=
        0
      : false);

  /*
   * --------------------------------
   * QUANTITY
   * --------------------------------
   */

  function decreaseQuantity() {
    setQuantity(
      (current) =>
        Math.max(
          1,
          current - 1
        )
    );
  }

  function increaseQuantity() {
    setQuantity(
      (current) =>
        Math.min(
          availableStock,
          current + 1
        )
    );
  }

  /*
   * --------------------------------
   * ADD TO CART
   * --------------------------------
   */

  async function handleAddToCart() {
    if (
      status ===
      "loading"
    ) {
      return;
    }

    if (
      !session?.user
    ) {
      showAlert(
        "Please login to add products to your cart.",
        "warning"
      );

      return;
    }

    if (
      !selectedVariant
    ) {
      showAlert(
        "Please select the required product options.",
        "warning"
      );

      return;
    }

    if (
      selectedVariant.stock <=
      0
    ) {
      showAlert(
        "This item is out of stock.",
        "error"
      );

      return;
    }

    try {
      setIsAdding(
        true
      );

      const response =
        await fetch(
          "/api/cart",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                variantId:
                  selectedVariant.id,

                quantity,
              }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok
      ) {
        showAlert(
          result.message ??
            "Unable to add product to cart.",
          "error"
        );

        return;
      }

      showAlert(
        result.message ??
          "Product added to cart successfully.",
        "success"
      );

      notifyCartUpdated();

      setQuantity(
        1
      );
    } catch (error) {
      console.error(
        "Add to cart request error:",
        error
      );

      showAlert(
        "Something went wrong while adding the product.",
        "error"
      );
    } finally {
      setIsAdding(
        false
      );
    }
  }

  /*
   * --------------------------------
   * UI
   * --------------------------------
   */

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-[#d9dee7] bg-white transition-shadow hover:shadow-sm">
      {/* Product Image */}

      <div className="relative mx-3 mt-3 h-[190px] overflow-hidden rounded-[3px] bg-[#f5f5f5]">
        {product.image ? (
          <Image
            src={
              product.image.url
            }
            alt={
              product.image
                .altText ??
              product.name
            }
            fill
            sizes="(max-width: 419px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No image available
          </div>
        )}

        {product.totalStock <=
        0 ? (
          <span className="absolute right-2 top-2 rounded-[3px] bg-red-500 px-2 py-1 text-[10px] font-medium text-white">
            Out of Stock
          </span>
        ) : null}
      </div>

      {/* Product Body */}

      <div className="flex flex-1 flex-col p-3">
        {/* Product Name */}

        <h2 className="min-h-[38px] text-[13px] font-semibold leading-[19px] text-[#20252c]">
  {product.name}
</h2>

<div className="mt-1 min-h-[32px]">
  {product.description ? (
    <p className="line-clamp-2 text-[11px] leading-4 text-gray-500">
      {product.description}
    </p>
  ) : null}
</div>

        {/* Price + Stock */}

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
              Price
            </p>

            <p className="mt-0.5 whitespace-nowrap text-[16px] font-semibold leading-none text-[#087ff5]">
              Rs.{" "}
              {displayPrice.toLocaleString(
                "en-PK"
              )}
            </p>
          </div>

          <span
            className={`shrink-0 whitespace-nowrap text-[9px] font-medium ${
              availableStock >
              0
                ? "text-green-600"
                : "text-red-500"
            }`}
          >
            {availableStock >
            0
              ? `${availableStock} left`
              : "Out of Stock"}
          </span>
        </div>

        {/* Variant Selection */}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Size */}

          <select
            value={
              selectedSizeId
            }
            onChange={(
              event
            ) => {
              setSelectedSizeId(
                event.target
                  .value
              );

              setQuantity(
                1
              );
            }}
            disabled={
              sizes.length ===
              0
            }
            className="h-9 w-full min-w-0 rounded-[4px] border border-[#d6dde7] bg-white px-2 text-[11px] text-gray-600 outline-none transition focus:border-[#087ff5] disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {sizes.length
                ? "Select Size"
                : "No Size"}
            </option>

            {sizes.map(
              (size) => (
                <option
                  key={
                    size.id
                  }
                  value={
                    size.id
                  }
                >
                  {
                    size.name
                  }
                </option>
              )
            )}
          </select>

          {/* Color */}

          <select
            value={
              selectedColorId
            }
            onChange={(
              event
            ) => {
              setSelectedColorId(
                event.target
                  .value
              );

              setQuantity(
                1
              );
            }}
            disabled={
              colors.length ===
              0
            }
            className="h-9 w-full min-w-0 rounded-[4px] border border-[#d6dde7] bg-white px-2 text-[11px] text-gray-600 outline-none transition focus:border-[#087ff5] disabled:bg-gray-50 disabled:text-gray-400"
          >
            <option value="">
              {colors.length
                ? "Select Color"
                : "No Color"}
            </option>

            {colors.map(
              (color) => (
                <option
                  key={
                    color.id
                  }
                  value={
                    color.id
                  }
                >
                  {
                    color.name
                  }
                </option>
              )
            )}
          </select>
        </div>

        {/* Quantity + Cart */}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Quantity Counter */}

          <div className="flex h-9 w-full items-center sm:w-auto">
            <button
              type="button"
              onClick={
                decreaseQuantity
              }
              disabled={
                quantity <= 1
              }
              aria-label="Decrease quantity"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-l-[4px] border border-[#d6dde7] text-base font-light text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-8"
            >
              −
            </button>

            <div className="flex h-9 flex-1 items-center justify-center border-y border-[#d6dde7] px-2 text-xs font-medium text-gray-700 sm:min-w-9 sm:flex-none">
              {quantity}
            </div>

            <button
              type="button"
              onClick={
                increaseQuantity
              }
              disabled={
                isOutOfStock ||
                quantity >=
                  availableStock
              }
              aria-label="Increase quantity"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-[4px] border border-[#d6dde7] text-base font-light text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-8"
            >
              +
            </button>
          </div>

          {/* Add to Cart */}

          <button
            type="button"
            onClick={
              handleAddToCart
            }
            disabled={
              isOutOfStock ||
              isAdding ||
              status ===
                "loading"
            }
            className="h-9 w-full rounded-[4px] bg-[#087ff5] px-3 text-xs font-semibold text-white transition hover:bg-[#006fdb] disabled:cursor-not-allowed disabled:bg-gray-300 sm:flex-1"
          >
            {isAdding
              ? "Adding..."
              : isOutOfStock
                ? "Out of Stock"
                : "Add to Cart"}
          </button>
        </div>
      </div>

      {/* Alert */}

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
    </article>
  );
}

/*
 * --------------------------------
 * FIND SELECTED VARIANT
 * --------------------------------
 */

function findVariant({
  variants,
  sizeId,
  colorId,
}: {
  variants:
    PublicProductVariant[];

  sizeId: string;

  colorId: string;
}) {
  /*
   * Simple product:
   * one variant without
   * size or color.
   */
  if (
    !sizeId &&
    !colorId &&
    variants.length ===
      1 &&
    !variants[0].size &&
    !variants[0].color
  ) {
    return variants[0];
  }

  /*
   * Variable product:
   * find exact size/color
   * combination.
   */
  return variants.find(
    (variant) => {
      const sizeMatches =
        variant.size
          ? variant.size
              .id ===
            sizeId
          : !sizeId;

      const colorMatches =
        variant.color
          ? variant.color
              .id ===
            colorId
          : !colorId;

      return (
        sizeMatches &&
        colorMatches
      );
    }
  );
}