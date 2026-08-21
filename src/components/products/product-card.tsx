"use client";

import Image from "next/image";

import { useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import Alert from "@/components/ui/alert";

import { useAlert } from "@/hooks/use-alert";

import { notifyCartUpdated } from "@/lib/cart-events";

import type { PublicProduct, PublicProductVariant } from "@/types/product";

type ProductCardProps = {
  product: PublicProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { data: session, status } = useSession();

  const { alert, showAlert, closeAlert } = useAlert();

  // COLORS

  const colors = useMemo(() => {
    const uniqueColors = new Map<
      string,
      NonNullable<PublicProductVariant["color"]>
    >();

    product.variants.forEach((variant) => {
      if (variant.color) {
        uniqueColors.set(variant.color.id, variant.color);
      }
    });

    return Array.from(uniqueColors.values());
  }, [product.variants]);

  //  SIZES

  const sizes = useMemo(() => {
    const uniqueSizes = new Map<
      string,
      NonNullable<PublicProductVariant["size"]>
    >();

    product.variants.forEach((variant) => {
      if (variant.size) {
        uniqueSizes.set(variant.size.id, variant.size);
      }
    });

    return Array.from(uniqueSizes.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
  }, [product.variants]);

  //  STATE

  const initialVariant = product.image?.colorId
    ? product.variants.find(
        (variant) =>
          variant.color?.id === product.image?.colorId && variant.stock > 0,
      )
    : undefined;

  const [selectedSizeId, setSelectedSizeId] = useState(
    initialVariant?.size?.id ?? "",
  );

  const [selectedColorId, setSelectedColorId] = useState(
    initialVariant?.color?.id ?? "",
  );

  const [quantity, setQuantity] = useState(1);

  const [isAdding, setIsAdding] = useState(false);

  // IMAGE HOVER STATE

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isImageHovered, setIsImageHovered] = useState(false);

  const generalImages = product.images.filter((image) => !image.colorId);
  const baseImages = generalImages.length > 0 ? generalImages : product.images;
  const colorImages = selectedColorId
    ? product.images.filter((image) => image.colorId === selectedColorId)
    : [];
  const activeImages = colorImages.length > 0 ? colorImages : baseImages;

  // Change image every2s

  useEffect(() => {
    if (!isImageHovered || activeImages.length <= 1) {
      return;
    }

    const interval = window.setInterval(
      () => {
        setCurrentImageIndex(
          (current) => (current + 1) % activeImages.length,
        );
      },

      2000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [activeImages.length, isImageHovered]);

  /*
   * Immediately show second
   * image when hover begins.
   */
  function handleImageMouseEnter() {
    if (selectedVariantImageUrl || activeImages.length <= 1) {
      return;
    }

    setIsImageHovered(true);

    setCurrentImageIndex(1);
  }
  // when leave return primary
  function handleImageMouseLeave() {
    setIsImageHovered(false);

    setCurrentImageIndex(0);
  }

  const currentProductImage =
    activeImages[currentImageIndex] ?? product.image;

  //  SELECTED VARIANT by user

  const selectedVariant = findVariant({
    variants: product.variants,

    sizeId: selectedSizeId,

    colorId: selectedColorId,
  });

  const displayPrice = selectedVariant?.price ?? product.minPrice;

  const availableStock = selectedVariant?.stock ?? product.totalStock;

  const isOutOfStock =
    product.totalStock <= 0 ||
    (selectedVariant ? selectedVariant.stock <= 0 : false);

  // VARIANT OPTION AVAILABILITY

  function isColorAvailable(colorId: string) {
    return product.variants.some((variant) => {
      const colorMatches = variant.color?.id === colorId;

      return colorMatches && variant.stock > 0;
    });
  }

  function isSizeAvailable(sizeId: string) {
    return product.variants.some((variant) => {
      const sizeMatches = variant.size?.id === sizeId;

      const colorMatches =
        !selectedColorId ||
        (variant.color ? variant.color.id === selectedColorId : false);

      return sizeMatches && colorMatches && variant.stock > 0;
    });
  }

  /*
   * IMAGE RULES
   *
   * 1. Exact color + size selected:
   *    use that exact variant image.
   *
   * 2. Only color selected:
   *    use the first image found for that color.
   *
   * 3. Color deselected:
   *    return to the normal/base product image.
   */
  const selectedVariantImage = (() => {
    if (selectedVariant?.imageUrl) {
      return {
        id: `variant:${selectedVariant.id}`,
        url: selectedVariant.imageUrl,
      };
    }

    if (!selectedColorId) {
      return null;
    }

    if (colorImages.length > 0) {
      return null;
    }

    const colorVariant = product.variants.find(
      (variant) =>
        variant.color?.id === selectedColorId && Boolean(variant.imageUrl),
    );

    if (!colorVariant?.imageUrl) {
      return null;
    }

    return {
      id: `color-variant:${colorVariant.id}`,
      url: colorVariant.imageUrl,
    };
  })();

  const selectedVariantImageUrl = selectedVariantImage?.url ?? null;

  const displayImage = selectedVariantImage
    ? {
        id: selectedVariantImage.id,
        url: selectedVariantImage.url,
        altText: product.name,
      }
    : currentProductImage;

  // QUANTITY

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(availableStock, current + 1));
  }

  // ADD TO CART

  async function handleAddToCart() {
    if (status === "loading") {
      return;
    }

    if (!session?.user) {
      showAlert("Please login to add products to your cart.", {
        variant: "warning",
      });

      return;
    }

    if (!selectedVariant) {
      showAlert("Please select the required product options.", {
        variant: "warning",
      });

      return;
    }

    if (selectedVariant.stock <= 0) {
      showAlert("This item is out of stock.", {
        variant: "error",
      });

      return;
    }

    try {
      setIsAdding(true);

      const response = await fetch("/api/cart", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          variantId: selectedVariant.id,

          quantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to add product to cart.", {
          variant: "error",
        });

        return;
      }

      showAlert(result.message ?? "Product added to cart successfully.", {
        variant: "success",
      });

      notifyCartUpdated();

      setQuantity(1);
    } catch (error) {
      console.error("Add to cart request error:", error);

      showAlert("Something went wrong while adding the product.", {
        variant: "error",
      });
    } finally {
      setIsAdding(false);
    }
  }

  // UI;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-[#d9dee7] bg-white transition-shadow hover:shadow-sm">
      {/* Product Image Gallery */}

      <div
        className="group relative mx-3 mt-3 h-47.5 overflow-hidden rounded-[3px] bg-[#f5f5f5]"
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
      >
        {displayImage ? (
          <Image
            key={displayImage.id}
            src={displayImage.url}
            alt={displayImage.altText ?? product.name}
            fill
            sizes="(max-width: 419px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-gray-400">
            No image available
          </div>
        )}

        {/* Image Indicators */}

        {!selectedVariantImageUrl && activeImages.length > 1 ? (
          <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {activeImages.map((image, index) => (
              <span
                key={image.id}
                className={`h-1.5 rounded-full shadow-sm transition-all duration-200 ${
                  currentImageIndex === index
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        ) : null}

        {/* Out Of Stock */}

        {product.totalStock <= 0 ? (
          <span className="absolute right-2 top-2 rounded-[3px] bg-red-500 px-2 py-1 text-[10px] font-medium text-white">
            Out of Stock
          </span>
        ) : null}
      </div>

      {/* Product Body */}

      <div className="flex flex-1 flex-col p-3">
        {/* Product Name */}

        <h2 className="line-clamp-1 min-h-5 text-[13px] font-semibold leading-5 text-[#20252c]">
          {product.name}
        </h2>

        {/* Price + Stock */}

        <div className="mt-2.5 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
              Price
            </p>

            <p className="mt-0.5 whitespace-nowrap text-[16px] font-semibold leading-none text-[#087ff5]">
              Rs. {displayPrice.toLocaleString("en-PK")}
            </p>
          </div>

          <span
            className={`shrink-0 whitespace-nowrap text-[9px] font-medium ${
              availableStock > 0 ? "text-green-600" : "text-red-500"
            }`}
          >
            {availableStock > 0 ? `${availableStock} left` : "Out of Stock"}
          </span>
        </div>

        {/* Variant Selection */}

        <div className="mt-3 min-h-18 space-y-2">
          {/* Colors */}

          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[9px] font-medium uppercase tracking-wide text-gray-400">
              Color
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {colors.length > 0 ? (
                colors.map((color) => {
                  const selected = selectedColorId === color.id;
                  const available = isColorAvailable(color.id);

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => {
                        const nextColorId =
                          selectedColorId === color.id ? "" : color.id;

                        setSelectedColorId(nextColorId);
                        setCurrentImageIndex(0);

                        if (!nextColorId) {
                          setSelectedSizeId("");
                        } else {
                          const availableVariants = product.variants.filter(
                            (variant) =>
                              variant.color?.id === nextColorId &&
                              variant.stock > 0,
                          );
                          const currentSizeStillAvailable =
                            availableVariants.some(
                              (variant) =>
                                variant.size?.id === selectedSizeId,
                            );

                          if (!currentSizeStillAvailable) {
                            setSelectedSizeId(
                              availableVariants.length === 1
                                ? (availableVariants[0].size?.id ?? "")
                                : "",
                            );
                          }
                        }

                        setQuantity(1);
                      }}
                      disabled={!available && !selected}
                      title={color.name}
                      aria-label={`Select ${color.name}`}
                      aria-pressed={selected}
                      className={`relative flex h-5 w-5 items-center justify-center rounded-full transition ${
                        selected
                          ? "ring-2 ring-[#087ff5] ring-offset-1"
                          : "hover:ring-1 hover:ring-gray-300 hover:ring-offset-1"
                      } ${
                        !available && !selected
                          ? "cursor-not-allowed opacity-30"
                          : ""
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-gray-300"
                        style={{
                          backgroundColor: color.hexacode ?? "#e5e7eb",
                        }}
                      />

                      {selected ? (
                        <span className="pointer-events-none absolute inset-0 rounded-full border border-white/70" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  disabled
                  title="No color option"
                  aria-label="No color option"
                  className="flex h-5 items-center justify-center rounded-[3px] border border-gray-200 bg-gray-50 px-2 text-[9px] font-medium text-gray-300"
                >
                  N/A
                </button>
              )}
            </div>
          </div>

          {/* Sizes */}

          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 text-[9px] font-medium uppercase tracking-wide text-gray-400">
              Size
            </span>

            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {sizes.length > 0 ? (
                sizes.map((size) => {
                  const selected = selectedSizeId === size.id;
                  const available = isSizeAvailable(size.id);

                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => {
                        const nextSizeId =
                          selectedSizeId === size.id ? "" : size.id;

                        setSelectedSizeId(nextSizeId);
                        setQuantity(1);
                      }}
                      disabled={!available && !selected}
                      aria-pressed={selected}
                      className={`flex h-6 min-w-6 items-center justify-center rounded-[3px] border px-1.5 text-[10px] font-medium leading-none transition ${
                        selected
                          ? "border-[#087ff5] bg-blue-50 text-[#087ff5]"
                          : "border-[#d6dde7] bg-white text-gray-600 hover:border-[#9fcfff]"
                      } ${
                        !available && !selected
                          ? "cursor-not-allowed bg-gray-50 text-gray-300 opacity-60"
                          : ""
                      }`}
                    >
                      {size.name}
                    </button>
                  );
                })
              ) : (
                <button
                  type="button"
                  disabled
                  title="No size option"
                  aria-label="No size option"
                  className="flex h-6 min-w-9 items-center justify-center rounded-[3px] border border-gray-200 bg-gray-50 px-2 text-[9px] font-medium text-gray-300"
                >
                  N/A
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quantity + Cart */}

        <div className="mt-auto flex flex-col gap-2 pt-2.5 sm:flex-row sm:items-center">
          {/* Quantity Counter */}

          <div className="flex h-8 w-full items-center sm:w-auto">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-l-sm border border-[#d6dde7] text-sm font-light text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-7"
            >
              −
            </button>

            <div className="flex h-8 flex-1 items-center justify-center border-y border-[#d6dde7] px-2 text-[11px] font-medium text-gray-700 sm:min-w-8 sm:flex-none">
              {quantity}
            </div>

            <button
              type="button"
              onClick={increaseQuantity}
              disabled={isOutOfStock || quantity >= availableStock}
              aria-label="Increase quantity"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-r-sm border border-[#d6dde7] text-sm font-light text-[#087ff5] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-7"
            >
              +
            </button>
          </div>

          {/* Add to Cart */}

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding || status === "loading"}
            className="h-8 w-full rounded-sm bg-[#087ff5] px-3 text-[11px] font-semibold text-white transition hover:bg-[#006fdb] disabled:cursor-not-allowed disabled:bg-gray-300 sm:flex-1"
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
  variants: PublicProductVariant[];

  sizeId: string;

  colorId: string;
}) {
  /*
   * Simple product.
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
   * Variable product.
   */
  return variants.find((variant) => {
    const sizeMatches = variant.size ? variant.size.id === sizeId : !sizeId;

    const colorMatches = variant.color
      ? variant.color.id === colorId
      : !colorId;

    return sizeMatches && colorMatches;
  });
}
