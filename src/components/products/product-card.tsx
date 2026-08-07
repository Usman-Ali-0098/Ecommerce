"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import Alert from "@/components/ui/alert";
import { useAlert } from "@/hooks/use-alert";

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

  const colors = useMemo(() => {
    const uniqueColors = new Map<
      string,
      NonNullable<PublicProductVariant["color"]>
    >();

    product.variants.forEach((variant) => {
      if (variant.color) {
        uniqueColors.set(
          variant.color.id,
          variant.color
        );
      }
    });

    return Array.from(
      uniqueColors.values()
    );
  }, [product.variants]);

  const sizes = useMemo(() => {
    const uniqueSizes = new Map<
      string,
      NonNullable<PublicProductVariant["size"]>
    >();

    product.variants.forEach((variant) => {
      if (variant.size) {
        uniqueSizes.set(
          variant.size.id,
          variant.size
        );
      }
    });

    return Array.from(
      uniqueSizes.values()
    ).sort(
      (a, b) =>
        a.sortOrder - b.sortOrder
    );
  }, [product.variants]);

  const [selectedSizeId, setSelectedSizeId] =
    useState("");

  const [
    selectedColorId,
    setSelectedColorId,
  ] = useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [isAdding, setIsAdding] =
    useState(false);

  const selectedVariant =
    findVariant({
      variants: product.variants,
      sizeId: selectedSizeId,
      colorId: selectedColorId,
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
      ? selectedVariant.stock <= 0
      : false);

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(
        availableStock,
        current + 1
      )
    );
  }

  async function handleAddToCart() {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      showAlert(
        "Please login to add products to your cart.",
        "warning"
      );

      return;
    }

    if (!selectedVariant) {
      showAlert(
        "Please select the required product options.",
        "warning"
      );

      return;
    }

    if (selectedVariant.stock <= 0) {
      showAlert(
        "This item is out of stock.",
        "error"
      );

      return;
    }

    try {
      setIsAdding(true);

      const response =
        await fetch("/api/cart", {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            variantId:
              selectedVariant.id,
            quantity,
          }),
        });

      const result =
        await response.json();

      if (!response.ok) {
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

      setQuantity(1);
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
      setIsAdding(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[4px] border border-[#d9dee7] bg-white">
      {/* Product Image */}
      <div className="relative mx-4 mt-4 h-[220px] overflow-hidden bg-[#f5f5f5]">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={
              product.image.altText ??
              product.name
            }
            fill
            sizes="(max-width: 419px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}

        {product.totalStock <= 0 ? (
          <span className="absolute right-3 top-3 rounded-[3px] bg-[#ef3340] px-3 py-1.5 text-xs font-medium text-white">
            Out Of Stock
          </span>
        ) : null}
      </div>

      <div className="p-4">
        {/* Product Name */}
        <h2 className="min-h-[42px] text-[15px] font-medium leading-[21px] text-[#20252c]">
          {product.name}
        </h2>

        {/* Price + Stock */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-[#89919c]">
              Price:
            </span>

            <span className="text-[21px] font-normal text-[#0b80ff]">
              Rs.{" "}
              {displayPrice.toLocaleString(
                "en-PK"
              )}
            </span>
          </div>

          <span
            className={`whitespace-nowrap text-sm font-medium ${
              availableStock > 0
                ? "text-[#16a34a]"
                : "text-red-500"
            }`}
          >
            {availableStock > 0
              ? `${availableStock} Items Left`
              : "Out of Stock"}
          </span>
        </div>

        {/* Variant Selection */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <select
            value={selectedSizeId}
            onChange={(event) => {
              setSelectedSizeId(
                event.target.value
              );

              setQuantity(1);
            }}
            disabled={
              sizes.length === 0
            }
            className="h-10 w-full rounded-[4px] border border-[#d6dde7] bg-white px-2 text-sm text-[#7d8794] outline-none focus:border-[#0b80ff]"
          >
            <option value="">
              {sizes.length
                ? "Select Size"
                : "No Size"}
            </option>

            {sizes.map((size) => (
              <option
                key={size.id}
                value={size.id}
              >
                {size.name}
              </option>
            ))}
          </select>

          <select
            value={selectedColorId}
            onChange={(event) => {
              setSelectedColorId(
                event.target.value
              );

              setQuantity(1);
            }}
            disabled={
              colors.length === 0
            }
            className="h-10 w-full rounded-[4px] border border-[#d6dde7] bg-white px-2 text-sm text-[#7d8794] outline-none focus:border-[#0b80ff]"
          >
            <option value="">
              {colors.length
                ? "Select Color"
                : "No Color"}
            </option>

            {colors.map((color) => (
              <option
                key={color.id}
                value={color.id}
              >
                {color.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity + Add to Cart */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-10 items-center gap-1">
            <button
              type="button"
              onClick={
                decreaseQuantity
              }
              disabled={
                quantity <= 1
              }
              aria-label="Decrease quantity"
              className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#d6dde7] text-xl font-light text-[#0b80ff] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              −
            </button>

            <div className="flex h-10 min-w-12 items-center justify-center rounded-[4px] border border-[#d6dde7] px-2 text-sm text-[#333]">
              {String(
                quantity
              ).padStart(2, "0")}
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
              className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-[#d6dde7] text-xl font-light text-[#0b80ff] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={
              handleAddToCart
            }
            disabled={
              isOutOfStock ||
              isAdding ||
              status === "loading"
            }
            className="h-10 flex-1 whitespace-nowrap rounded-[4px] bg-[#087ff5] px-4 text-[15px] font-medium text-white transition hover:bg-[#006fdb] disabled:cursor-not-allowed disabled:bg-gray-300"
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
          message={alert.message}
          variant={alert.variant}
          onClose={closeAlert}
        />
      ) : null}
    </article>
  );
}

function findVariant({
  variants,
  sizeId,
  colorId,
}: {
  variants: PublicProductVariant[];
  sizeId: string;
  colorId: string;
}) {
  /*
   * Simple product:
   * one variant without size or color.
   */
  if (
    !sizeId &&
    !colorId &&
    variants.length === 1 &&
    !variants[0].size &&
    !variants[0].color
  ) {
    return variants[0];
  }

  /*
   * Variable product:
   * find exact size/color combination.
   */
  return variants.find(
    (variant) => {
      const sizeMatches =
        variant.size
          ? variant.size.id ===
            sizeId
          : !sizeId;

      const colorMatches =
        variant.color
          ? variant.color.id ===
            colorId
          : !colorId;

      return (
        sizeMatches &&
        colorMatches
      );
    }
  );
}