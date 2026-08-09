"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  ArrowLeft,
  ImageUp,
  Plus,
  Trash2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import Alert from "@/components/ui/alert";
import Button from "@/components/ui/button";

import { useAlert } from "@/hooks/use-alert";

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

type ColorOption = {
  id: string;
  name: string;
  hexacode: string | null;
};

type SizeOption = {
  id: string;
  name: string;
};

type AdminProductFormProps = {
  categories: CategoryOption[];
  colors: ColorOption[];
  sizes: SizeOption[];
};

type AddedVariant = {
  id: string;

  colorId: string | null;
  colorName: string | null;

  sizeId: string | null;
  sizeName: string | null;

  quantity: number;
};

export default function AdminProductForm({
  categories,
  colors,
  sizes,
}: AdminProductFormProps) {
  const router = useRouter();

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  /*
   * Product information
   */
  const [
    name,
    setName,
  ] = useState("");

  const [
    categoryId,
    setCategoryId,
  ] = useState("");

  const [
    price,
    setPrice,
  ] = useState("");

  const [
    quantity,
    setQuantity,
  ] = useState("");

  const [
    baseSku,
    setBaseSku,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    imageUrl,
    setImageUrl,
  ] = useState("");

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  /*
   * Variant builder
   */
  const [
    selectedColorId,
    setSelectedColorId,
  ] = useState("");

  const [
    selectedSizeId,
    setSelectedSizeId,
  ] = useState("");

  const [
    variantQuantity,
    setVariantQuantity,
  ] = useState("");

  const [
    variants,
    setVariants,
  ] = useState<
    AddedVariant[]
  >([]);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  /*
   * If variants exist,
   * total stock is calculated
   * automatically.
   */
  const totalVariantQuantity =
    useMemo(() => {
      return variants.reduce(
        (
          total,
          variant
        ) =>
          total +
          variant.quantity,
        0
      );
    }, [variants]);

  /*
   * Convert names into
   * SKU-safe values.
   */
  function skuPart(
    value: string
  ) {
    return value
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );
  }

  function addVariant() {
    if (
      !selectedColorId &&
      !selectedSizeId
    ) {
      showAlert(
        "Select at least a color or size.",
        "warning"
      );

      return;
    }

    const qty = Number(
      variantQuantity
    );

    if (
      !Number.isInteger(
        qty
      ) ||
      qty < 0
    ) {
      showAlert(
        "Enter a valid variant quantity.",
        "warning"
      );

      return;
    }

    const color =
      colors.find(
        (item) =>
          item.id ===
          selectedColorId
      );

    const size =
      sizes.find(
        (item) =>
          item.id ===
          selectedSizeId
      );

    /*
     * Prevent duplicate
     * color-size combinations.
     */
    const alreadyExists =
      variants.some(
        (variant) =>
          variant.colorId ===
            (color?.id ??
              null) &&
          variant.sizeId ===
            (size?.id ??
              null)
      );

    if (alreadyExists) {
      showAlert(
        "This color and size combination already exists.",
        "warning"
      );

      return;
    }

    setVariants(
      (current) => [
        ...current,

        {
          id:
            crypto.randomUUID(),

          colorId:
            color?.id ??
            null,

          colorName:
            color?.name ??
            null,

          sizeId:
            size?.id ??
            null,

          sizeName:
            size?.name ??
            null,

          quantity: qty,
        },
      ]
    );

    setSelectedColorId("");
    setSelectedSizeId("");
    setVariantQuantity("");
  }

  function removeVariant(
    id: string
  ) {
    setVariants(
      (current) =>
        current.filter(
          (variant) =>
            variant.id !== id
        )
    );
  }

  function validateForm() {
    if (!name.trim()) {
      showAlert(
        "Product name is required.",
        "warning"
      );

      return false;
    }

    if (!categoryId) {
      showAlert(
        "Please select a category.",
        "warning"
      );

      return false;
    }

    const numericPrice =
      Number(price);

    if (
      !Number.isFinite(
        numericPrice
      ) ||
      numericPrice < 0
    ) {
      showAlert(
        "Please enter a valid price.",
        "warning"
      );

      return false;
    }

    if (!baseSku.trim()) {
      showAlert(
        "Product SKU is required.",
        "warning"
      );

      return false;
    }

    /*
     * Quantity required only
     * for simple product.
     */
    if (
      variants.length === 0
    ) {
      const numericQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          numericQuantity
        ) ||
        numericQuantity < 0
      ) {
        showAlert(
          "Please enter a valid quantity.",
          "warning"
        );

        return false;
      }
    }

    return true;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    /*
     * SIMPLE PRODUCT
     */
    const productVariants =
      variants.length === 0
        ? [
            {
              sku:
                baseSku
                  .trim()
                  .toUpperCase(),

              price:
                Number(
                  price
                ),

              stock:
                Number(
                  quantity
                ),

              colorId: null,
              sizeId: null,
            },
          ]

        /*
         * VARIABLE PRODUCT
         */
        : variants.map(
            (
              variant,
              index
            ) => {
              const parts = [
                skuPart(
                  baseSku
                ),
              ];

              if (
                variant.colorName
              ) {
                parts.push(
                  skuPart(
                    variant.colorName
                  )
                );
              }

              if (
                variant.sizeName
              ) {
                parts.push(
                  skuPart(
                    variant.sizeName
                  )
                );
              }

              /*
               * Fallback guarantees
               * unique-looking SKU.
               */
              if (
                parts.length ===
                1
              ) {
                parts.push(
                  String(
                    index + 1
                  )
                );
              }

              return {
                sku:
                  parts.join(
                    "-"
                  ),

                price:
                  Number(
                    price
                  ),

                stock:
                  variant.quantity,

                colorId:
                  variant.colorId,

                sizeId:
                  variant.sizeId,
              };
            }
          );

    try {
      setIsSubmitting(
        true
      );

      const response =
        await fetch(
          "/api/admin/products",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name:
                  name.trim(),

                description:
                  description.trim(),

                categoryId,

                imageUrl:
                  imageUrl.trim() ||
                  null,

                isActive,

                variants:
                  productVariants,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        showAlert(
          result.message ??
            "Unable to create product.",
          "error"
        );

        return;
      }

      router.push(
        "/admin/products"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Create product error:",
        error
      );

      showAlert(
        "Something went wrong while creating the product.",
        "error"
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <>
      <form
        onSubmit={
          handleSubmit
        }
        className="mx-auto max-w-6xl"
      >
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/products"
              )
            }
            className="flex items-center gap-3 text-left"
          >
            <ArrowLeft
              size={24}
              className="text-blue-600"
            />

            <span className="text-3xl font-semibold tracking-tight text-[#08265a]">
              Add a Single Product
            </span>
          </button>

          <div className="mt-8 border-b border-gray-300" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[290px_1fr]">
          {/* LEFT - IMAGE */}
          <div>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-5">
              <div className="flex min-h-[230px] flex-col items-center justify-center">
                {imageUrl ? (
                  <div className="mb-5 flex h-28 w-full items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                    <img
                      src={
                        imageUrl
                      }
                      alt="Product preview"
                      className="h-full w-full object-contain"
                      onError={(
                        event
                      ) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                    <ImageUp
                      size={38}
                      className="text-blue-600"
                    />
                  </div>
                )}

                <label className="mb-2 w-full text-sm font-medium text-gray-700">
                  Image URL / Path
                </label>

                <input
                  type="text"
                  value={
                    imageUrl
                  }
                  onChange={(
                    event
                  ) =>
                    setImageUrl(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="/products/shirt.jpg"
                  className="mb-4 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

                <div className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 text-base font-medium text-white">
                  Upload
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400">
              Actual file upload will
              be connected separately.
              Currently use an image
              URL or a path from your
              public folder.
            </p>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Product name */}
            <div>
              <label className="mb-2 block text-lg font-medium text-gray-800">
                Product Name
              </label>

              <textarea
                value={name}
                onChange={(
                  event
                ) =>
                  setName(
                    event
                      .target
                      .value
                  )
                }
                rows={2}
                placeholder="Cargo Trousers for Men - 6 Pocket Trousers"
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block text-lg font-medium text-gray-800">
                Category
              </label>

              <select
                value={
                  categoryId
                }
                onChange={(
                  event
                ) =>
                  setCategoryId(
                    event
                      .target
                      .value
                  )
                }
                className="h-14 w-full rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (
                    category
                  ) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                      {!category.isActive
                        ? " (Inactive)"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Price + Quantity */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-lg font-medium text-gray-800">
                  Price
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    price
                  }
                  onChange={(
                    event
                  ) =>
                    setPrice(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="00.00"
                  className="h-14 w-full rounded-lg border border-gray-300 px-4 text-base outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-lg font-medium text-gray-800">
                  Quantity
                </label>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    variants.length >
                    0
                      ? totalVariantQuantity
                      : quantity
                  }
                  onChange={(
                    event
                  ) =>
                    setQuantity(
                      event
                        .target
                        .value
                    )
                  }
                  readOnly={
                    variants.length >
                    0
                  }
                  placeholder="100"
                  className={`h-14 w-full rounded-lg border border-gray-300 px-4 text-base outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                    variants.length >
                    0
                      ? "bg-gray-50"
                      : "bg-white"
                  }`}
                />

                {variants.length >
                0 ? (
                  <p className="mt-1 text-xs text-gray-400">
                    Total quantity is
                    calculated from
                    variants.
                  </p>
                ) : null}
              </div>
            </div>

            {/* SKU */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                SKU
              </label>

              <input
                value={
                  baseSku
                }
                onChange={(
                  event
                ) =>
                  setBaseSku(
                    event
                      .target
                      .value
                  )
                }
                placeholder="PRODUCT-001"
                className="h-12 w-full rounded-lg border border-gray-300 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              <p className="mt-1 text-xs text-gray-400">
                For variable products,
                color and size will be
                added automatically to
                this SKU.
              </p>
            </div>

            {/* VARIANT ADDER */}
            <div>
              <label className="mb-2 block text-lg font-medium text-gray-800">
                Product Variants
              </label>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px_58px]">
                {/* Color */}
                <select
                  value={
                    selectedColorId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedColorId(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-14 rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-600 outline-none transition focus:border-blue-500"
                >
                  <option value="">
                    Select Color
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

                {/* Size */}
                <select
                  value={
                    selectedSizeId
                  }
                  onChange={(
                    event
                  ) =>
                    setSelectedSizeId(
                      event
                        .target
                        .value
                    )
                  }
                  className="h-14 rounded-lg border border-gray-300 bg-white px-4 text-base text-gray-600 outline-none transition focus:border-blue-500"
                >
                  <option value="">
                    Select Size
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

                {/* Qty */}
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    variantQuantity
                  }
                  onChange={(
                    event
                  ) =>
                    setVariantQuantity(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Enter Qty"
                  className="h-14 rounded-lg border border-gray-300 px-4 text-base outline-none transition focus:border-blue-500"
                />

                {/* + */}
                <button
                  type="button"
                  onClick={
                    addVariant
                  }
                  className="flex h-14 items-center justify-center rounded-lg border border-gray-300 bg-white text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
                  aria-label="Add variant"
                >
                  <Plus
                    size={24}
                  />
                </button>
              </div>
            </div>

            {/* ADDED VARIANTS */}
            {variants.length >
            0 ? (
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <div className="grid grid-cols-[1fr_1fr_120px_55px] bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600">
                  <div>
                    Color
                  </div>

                  <div>
                    Size
                  </div>

                  <div>
                    Quantity
                  </div>

                  <div />
                </div>

                {variants.map(
                  (
                    variant
                  ) => (
                    <div
                      key={
                        variant.id
                      }
                      className="grid grid-cols-[1fr_1fr_120px_55px] items-center border-t border-gray-100 px-4 py-3 text-sm text-gray-700"
                    >
                      <div>
                        {variant.colorName ??
                          "—"}
                      </div>

                      <div>
                        {variant.sizeName ??
                          "—"}
                      </div>

                      <div>
                        {
                          variant.quantity
                        }
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeVariant(
                            variant.id
                          )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50"
                        aria-label="Remove variant"
                      >
                        <Trash2
                          size={
                            18
                          }
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p className="-mt-3 text-xs text-gray-400">
                Optional. Leave this
                empty for a simple
                product.
              </p>
            )}

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(
                  event
                ) =>
                  setDescription(
                    event
                      .target
                      .value
                  )
                }
                rows={4}
                placeholder="Product description..."
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={
                  isActive
                }
                onChange={(
                  event
                ) =>
                  setIsActive(
                    event
                      .target
                      .checked
                  )
                }
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-gray-700">
                Active Product
              </span>
            </label>

            {/* Save */}
            <div className="flex justify-end pt-3">
              <div className="w-full sm:w-52">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting
                  }
                >
                  {isSubmitting
                    ? "Saving..."
                    : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

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