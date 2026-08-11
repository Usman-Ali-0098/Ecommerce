"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Script from "next/script";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ImageUp,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

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

type InitialVariant = {
  id: string;
  sku: string;
  price: number;
  stock: number;

  colorId: string | null;
  colorName: string | null;

  sizeId: string | null;
  sizeName: string | null;
};

type ProductInitialData = {
  id: string;

  name: string;
  description: string;

  categoryId: string;

  isActive: boolean;

  imageUrl: string;
  imagePublicId: string;

  baseSku: string;

  variants: InitialVariant[];
};

type AdminProductFormProps = {
  categories: CategoryOption[];
  colors: ColorOption[];
  sizes: SizeOption[];

  initialData?: ProductInitialData;
};

type AddedVariant = {
  id: string;

  existingVariantId?: string;

  sku: string;

  colorId: string | null;
  colorName: string | null;

  sizeId: string | null;
  sizeName: string | null;

  quantity: number;
};

type CloudinaryUploadInfo = {
  secure_url?: string;
  public_id?: string;
};

type CloudinaryWidgetResult = {
  event?: string;

  info?:
    | CloudinaryUploadInfo
    | string;
};

type CloudinaryUploadWidget = {
  open: () => void;
};

type CloudinarySignatureCallback = (
  signature: string
) => void;

type CloudinaryUploadSignature = (
  callback: CloudinarySignatureCallback,
  paramsToSign: Record<
    string,
    unknown
  >
) => void;

type CloudinaryWidgetOptions = {
  cloudName: string;
  apiKey: string;

  uploadSignature:
    CloudinaryUploadSignature;

  sources?: string[];

  multiple?: boolean;

  resourceType?:
    | "image"
    | "video"
    | "raw"
    | "auto";

  folder?: string;

  clientAllowedFormats?: string[];

  maxFileSize?: number;

  showAdvancedOptions?: boolean;

  cropping?: boolean;
};

type CloudinaryGlobal = {
  createUploadWidget: (
    options:
      CloudinaryWidgetOptions,

    callback: (
      error: unknown,
      result:
        CloudinaryWidgetResult
    ) => void
  ) => CloudinaryUploadWidget;
};

declare global {
  interface Window {
    cloudinary?:
      CloudinaryGlobal;
  }
}

export default function AdminProductForm({
  categories,
  colors,
  sizes,
  initialData,
}: AdminProductFormProps) {
  const router =
    useRouter();

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  const isEditMode =
    Boolean(initialData);

  /*
   * --------------------------------
   * SIMPLE PRODUCT CHECK
   * --------------------------------
   */

  const initialIsSimple =
    initialData?.variants.length ===
      1 &&
    !initialData.variants[0]
      ?.colorId &&
    !initialData.variants[0]
      ?.sizeId;

  /*
   * --------------------------------
   * PRODUCT STATE
   * --------------------------------
   */

  const [
    name,
    setName,
  ] = useState(
    initialData?.name ?? ""
  );

  const [
    categoryId,
    setCategoryId,
  ] = useState(
    initialData?.categoryId ?? ""
  );

  /*
   * Local copy is important because
   * newly-created categories can be
   * added without refreshing page.
   */
  const [
    categoryOptions,
    setCategoryOptions,
  ] = useState<CategoryOption[]>(
    categories
  );

  const [
    showNewCategory,
    setShowNewCategory,
  ] = useState(false);

  const [
    newCategoryName,
    setNewCategoryName,
  ] = useState("");

  const [
    isAddingCategory,
    setIsAddingCategory,
  ] = useState(false);

  const [
    price,
    setPrice,
  ] = useState(
    initialData
      ?.variants[0]
      ?.price
      ?.toString() ?? ""
  );

  const [
    quantity,
    setQuantity,
  ] = useState(
    initialIsSimple
      ? initialData!
          .variants[0]
          .stock
          .toString()
      : ""
  );

  const [
    baseSku,
    setBaseSku,
  ] = useState(
    initialData?.baseSku ?? ""
  );

  const [
    description,
    setDescription,
  ] = useState(
    initialData?.description ?? ""
  );

  const [
    isActive,
    setIsActive,
  ] = useState(
    initialData?.isActive ??
      true
  );

  /*
   * --------------------------------
   * IMAGE STATE
   * --------------------------------
   */

  const [
    imageUrl,
    setImageUrl,
  ] = useState(
    initialData?.imageUrl ?? ""
  );

  const [
    imagePublicId,
    setImagePublicId,
  ] = useState(
    initialData?.imagePublicId ??
      ""
  );

  const [
    isWidgetReady,
    setIsWidgetReady,
  ] = useState(false);

  const [
    isUploading,
    setIsUploading,
  ] = useState(false);

  /*
   * --------------------------------
   * VARIANT STATE
   * --------------------------------
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
  >(() => {
    if (
      !initialData ||
      initialData.variants
        .length === 0
    ) {
      return [];
    }

    if (initialIsSimple) {
      return [];
    }

    return initialData.variants.map(
      (variant) => ({
        id:
          crypto.randomUUID(),

        existingVariantId:
          variant.id,

        sku:
          variant.sku,

        colorId:
          variant.colorId,

        colorName:
          variant.colorName,

        sizeId:
          variant.sizeId,

        sizeName:
          variant.sizeName,

        quantity:
          variant.stock,
      })
    );
  });

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  /*
   * --------------------------------
   * TOTAL VARIANT STOCK
   * --------------------------------
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
   * --------------------------------
   * SKU HELPER
   * --------------------------------
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

  /*
   * --------------------------------
   * CLOUDINARY
   * --------------------------------
   */

  function openUploadWidget() {
    const cloudName =
      process.env
        .NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    const apiKey =
      process.env
        .NEXT_PUBLIC_CLOUDINARY_API_KEY;

    if (
      !cloudName ||
      !apiKey
    ) {
      showAlert(
        "Cloudinary configuration is missing.",
        {
          variant:
            "error",
        }
      );

      return;
    }

    if (
      !window.cloudinary
    ) {
      showAlert(
        "Image uploader is still loading.",
        {
          variant:
            "warning",
        }
      );

      return;
    }

    const widget =
      window.cloudinary
        .createUploadWidget(
          {
            cloudName,
            apiKey,

            uploadSignature: (
              callback,
              paramsToSign
            ) => {
              void (async () => {
                try {
                  const response =
                    await fetch(
                      "/api/admin/cloudinary-signature",
                      {
                        method:
                          "POST",

                        headers: {
                          "Content-Type":
                            "application/json",
                        },

                        body:
                          JSON.stringify({
                            paramsToSign,
                          }),
                      }
                    );

                  const result =
                    await response.json();

                  if (
                    !response.ok
                  ) {
                    throw new Error(
                      result.message ??
                        "Unable to authorize upload."
                    );
                  }

                  callback(
                    result.signature
                  );
                } catch (
                  error
                ) {
                  console.error(
                    "Cloudinary signature error:",
                    error
                  );

                  setIsUploading(
                    false
                  );

                  showAlert(
                    "Unable to authorize image upload.",
                    {
                      variant:
                        "error",
                    }
                  );
                }
              })();
            },

            folder:
              "ecommerce/products",

            multiple:
              false,

            resourceType:
              "image",

            sources: [
              "local",
              "url",
              "camera",
            ],

            clientAllowedFormats: [
              "jpg",
              "jpeg",
              "png",
              "webp",
            ],

            maxFileSize:
              5_000_000,

            showAdvancedOptions:
              false,

            cropping:
              false,
          },

          (
            error,
            result
          ) => {
            if (error) {
              console.error(
                "Cloudinary widget error:",
                error
              );

              setIsUploading(
                false
              );

              return;
            }

            if (
              result?.event ===
              "upload-added"
            ) {
              setIsUploading(
                true
              );
            }

            if (
              result?.event ===
                "success" &&
              typeof result.info ===
                "object" &&
              result.info !== null
            ) {
              const {
                secure_url,
                public_id,
              } = result.info;

              if (
                secure_url &&
                public_id
              ) {
                setImageUrl(
                  secure_url
                );

                setImagePublicId(
                  public_id
                );

                setIsUploading(
                  false
                );

                showAlert(
                  "Image uploaded successfully.",
                  {
                    variant:
                      "success",
                  }
                );
              }
            }

            if (
              result?.event ===
              "close"
            ) {
              setIsUploading(
                false
              );
            }
          }
        );

    widget.open();
  }

  function clearImage() {
    setImageUrl("");
    setImagePublicId("");
  }

  /*
   * --------------------------------
   * ADD VARIANT
   * --------------------------------
   */

  function addVariant() {
    if (
      !selectedColorId &&
      !selectedSizeId
    ) {
      showAlert(
        "Select at least a color or size.",
        {
          variant:
            "warning",
        }
      );

      return;
    }

    const qty =
      Number(
        variantQuantity
      );

    if (
      !Number.isInteger(qty) ||
      qty < 0
    ) {
      showAlert(
        "Enter a valid variant quantity.",
        {
          variant:
            "warning",
        }
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
        {
          variant:
            "warning",
        }
      );

      return;
    }

    const skuParts = [
      skuPart(
        baseSku ||
          name ||
          "PRODUCT"
      ),
    ];

    if (color?.name) {
      skuParts.push(
        skuPart(
          color.name
        )
      );
    }

    if (size?.name) {
      skuParts.push(
        skuPart(
          size.name
        )
      );
    }

    setVariants(
      (current) => [
        ...current,

        {
          id:
            crypto.randomUUID(),

          sku:
            skuParts.join(
              "-"
            ),

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

          quantity:
            qty,
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
            variant.id !==
            id
        )
    );
  }

  /*
   * --------------------------------
   * ADD CATEGORY
   * --------------------------------
   */

  async function addCategory() {
    const categoryName =
      newCategoryName.trim();

    if (!categoryName) {
      showAlert(
        "Enter a category name.",
        {
          variant:
            "warning",
        }
      );

      return;
    }

    try {
      setIsAddingCategory(
        true
      );

      const response =
        await fetch(
          "/api/admin/categories",
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
                  categoryName,
              }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        showAlert(
          result.message ??
            "Unable to add category.",
          {
            variant:
              "error",
          }
        );

        return;
      }

      const category =
        result.data
          .category as CategoryOption;

      /*
       * Add newly-created category
       * to the dropdown immediately.
       */
      setCategoryOptions(
        (current) => [
          ...current,
          category,
        ]
      );

      /*
       * Automatically select it.
       */
      setCategoryId(
        category.id
      );

      setNewCategoryName(
        ""
      );

      setShowNewCategory(
        false
      );

      showAlert(
        "Category added successfully.",
        {
          variant:
            "success",
        }
      );
    } catch (error) {
      console.error(
        "Add category error:",
        error
      );

      showAlert(
        "Something went wrong while adding the category.",
        {
          variant:
            "error",
        }
      );
    } finally {
      setIsAddingCategory(
        false
      );
    }
  }

  /*
   * --------------------------------
   * VALIDATION
   * --------------------------------
   */

  function validateForm() {
    if (!name.trim()) {
      showAlert(
        "Product name is required.",
        {
          variant:
            "warning",
        }
      );

      return false;
    }

    if (!categoryId) {
      showAlert(
        "Please select a category.",
        {
          variant:
            "warning",
        }
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
        {
          variant:
            "warning",
        }
      );

      return false;
    }

    if (
      variants.length === 0
    ) {
      if (!baseSku.trim()) {
        showAlert(
          "SKU is required.",
          {
            variant:
              "warning",
          }
        );

        return false;
      }

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
          {
            variant:
              "warning",
          }
        );

        return false;
      }
    }

    if (
      variants.length > 0
    ) {
      for (
        const variant
        of variants
      ) {
        if (
          !variant.sku.trim()
        ) {
          showAlert(
            "Every variant requires an SKU.",
            {
              variant:
                "warning",
            }
          );

          return false;
        }
      }
    }

    return true;
  }

  /*
   * --------------------------------
   * SUBMIT
   * --------------------------------
   */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    const productVariants =
      variants.length === 0
        ? [
            {
              id:
                initialIsSimple
                  ? initialData
                      ?.variants[0]
                      ?.id
                  : undefined,

              sku:
                baseSku
                  .trim()
                  .toUpperCase(),

              price:
                Number(price),

              stock:
                Number(
                  quantity
                ),

              colorId:
                null,

              sizeId:
                null,
            },
          ]
        : variants.map(
            (variant) => ({
              id:
                variant
                  .existingVariantId,

              sku:
                variant.sku
                  .trim()
                  .toUpperCase(),

              price:
                Number(price),

              stock:
                variant.quantity,

              colorId:
                variant.colorId,

              sizeId:
                variant.sizeId,
            })
          );

    try {
      setIsSubmitting(
        true
      );

      const endpoint =
        isEditMode
          ? `/api/admin/products/${initialData!.id}`
          : "/api/admin/products";

      const response =
        await fetch(
          endpoint,
          {
            method:
              isEditMode
                ? "PUT"
                : "POST",

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
                  imageUrl ||
                  null,

                imagePublicId:
                  imagePublicId ||
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
            "Unable to save product.",
          {
            variant:
              "error",
          }
        );

        return;
      }

      router.push(
        "/admin/products"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Save product error:",
        error
      );

      showAlert(
        "Something went wrong while saving the product.",
        {
          variant:
            "error",
        }
      );
    } finally {
      setIsSubmitting(
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
    <>
      <Script
        src="https://upload-widget.cloudinary.com/latest/global/all.js"
        strategy="afterInteractive"
        onLoad={() =>
          setIsWidgetReady(
            true
          )
        }
      />

      <form
        onSubmit={
          handleSubmit
        }
        className="mx-auto max-w-6xl"
      >
        {/* Header */}

        <div className="mb-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/products"
              )
            }
            className="flex items-center gap-2 text-left"
          >
            <ArrowLeft
              size={16}
              className="text-blue-600"
            />

            <span className="text-xl font-semibold tracking-tight text-gray-900">
              {isEditMode
                ? "Edit Product"
                : "Add a Single Product"}
            </span>
          </button>

          <div className="mt-5 border-b border-gray-200" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Image */}

          <div>
            <div className="overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white p-4">
              <div className="flex min-h-[250px] flex-col items-center justify-center">
                {imageUrl ? (
                  <>
                    <div className="relative mb-4 h-44 w-full overflow-hidden rounded-lg bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}

                      <img
                        src={
                          imageUrl
                        }
                        alt={
                          name ||
                          "Product"
                        }
                        className="h-full w-full object-contain"
                      />

                      <button
                        type="button"
                        onClick={
                          clearImage
                        }
                        title="Remove image"
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100"
                      >
                        <X
                          size={15}
                        />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={
                        openUploadWidget
                      }
                      disabled={
                        isUploading
                      }
                      className="flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isUploading ? (
                        <>
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />

                          Uploading...
                        </>
                      ) : (
                        <>
                          <ImageUp
                            size={15}
                          />

                          Change Image
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
                      {isUploading ? (
                        <Loader2
                          size={27}
                          className="animate-spin text-blue-600"
                        />
                      ) : (
                        <ImageUp
                          size={27}
                          className="text-blue-600"
                        />
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-800">
                      Product Image
                    </p>

                    <p className="mt-1 text-center text-[11px] leading-4 text-gray-400">
                      JPG, PNG or WEBP
                      <br />
                      Maximum 5 MB
                    </p>

                    <button
                      type="button"
                      onClick={
                        openUploadWidget
                      }
                      disabled={
                        !isWidgetReady ||
                        isUploading
                      }
                      className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isUploading ? (
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                      ) : (
                        <ImageUp
                          size={15}
                        />
                      )}

                      {isUploading
                        ? "Uploading..."
                        : isWidgetReady
                          ? "Upload Image"
                          : "Loading Uploader..."}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}

          <div className="min-w-0 space-y-4">
            {/* Product Name */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Product Name
              </label>

              <textarea
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                rows={2}
                placeholder="Enter product name"
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Category */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Category
              </label>

              <select
                value={
                  showNewCategory
                    ? "__new__"
                    : categoryId
                }
                onChange={(
                  event
                ) => {
                  const value =
                    event.target.value;

                  if (
                    value ===
                    "__new__"
                  ) {
                    setShowNewCategory(
                      true
                    );

                    return;
                  }

                  setShowNewCategory(
                    false
                  );

                  setCategoryId(
                    value
                  );
                }}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  Select Category
                </option>

                {categoryOptions.map(
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

                <option value="__new__">
                  + Add New Category
                </option>
              </select>

              {/* Add New Category */}

              {showNewCategory ? (
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={
                      newCategoryName
                    }
                    onChange={(
                      event
                    ) =>
                      setNewCategoryName(
                        event.target.value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();

                        void addCategory();
                      }
                    }}
                    placeholder="Enter category name"
                    disabled={
                      isAddingCategory
                    }
                    autoFocus
                    className="h-10 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void addCategory()
                    }
                    disabled={
                      isAddingCategory ||
                      !newCategoryName.trim()
                    }
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
                  >
                    {isAddingCategory ? (
                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />

                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus
                          size={14}
                        />

                        Add
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(
                        false
                      );

                      setNewCategoryName(
                        ""
                      );
                    }}
                    disabled={
                      isAddingCategory
                    }
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>

            {/* Price / Quantity */}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
                  Price
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(
                      event
                    ) =>
                      setPrice(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">
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
                      event.target.value
                    )
                  }
                  readOnly={
                    variants.length >
                    0
                  }
                  placeholder="0"
                  className={`h-10 w-full rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                    variants.length >
                    0
                      ? "cursor-default bg-gray-50"
                      : "bg-white"
                  }`}
                />

                {variants.length >
                0 ? (
                  <p className="mt-1 text-[10px] text-gray-400">
                    Calculated
                    automatically from
                    variant stock.
                  </p>
                ) : null}
              </div>
            </div>

            {/* SKU */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Base SKU
              </label>

              <input
                value={baseSku}
                onChange={(
                  event
                ) =>
                  setBaseSku(
                    event.target.value
                  )
                }
                placeholder="PRODUCT-001"
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-[10px] text-gray-400">
                Used as the main SKU
                for simple products
                and as the base when
                generating variant
                SKUs.
              </p>
            </div>

            {/* Variants */}

            <div className="rounded-xl border border-gray-200 bg-white">
              {/* Variant Header */}

              <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Product Variants
                  </h3>

                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Add color and/or
                    size combinations
                    with individual
                    stock quantities.
                  </p>
                </div>

                {variants.length >
                0 ? (
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-600">
                      {
                        variants.length
                      }{" "}
                      variant
                      {variants.length ===
                      1
                        ? ""
                        : "s"}
                    </span>

                    <span className="text-[11px] text-gray-500">
                      Stock{" "}
                      <strong className="font-semibold text-gray-800">
                        {
                          totalVariantQuantity
                        }
                      </strong>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Variant Builder */}

              <div className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_130px_42px]">
                  {/* Color */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Color
                    </label>

                    <select
                      value={
                        selectedColorId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedColorId(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select Color
                      </option>

                      {colors.map(
                        (
                          color
                        ) => (
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

                  {/* Size */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Size
                    </label>

                    <select
                      value={
                        selectedSizeId
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedSizeId(
                          event.target.value
                        )
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select Size
                      </option>

                      {sizes.map(
                        (
                          size
                        ) => (
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
                  </div>

                  {/* Variant Qty */}

                  <div>
                    <label className="mb-1 block text-[11px] font-medium text-gray-500">
                      Quantity
                    </label>

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
                          event.target.value
                        )
                      }
                      placeholder="0"
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  {/* Add */}

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={
                        addVariant
                      }
                      title="Add variant"
                      aria-label="Add variant"
                      className="flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 sm:w-10"
                    >
                      <Plus
                        size={16}
                      />
                    </button>
                  </div>
                </div>

                {/* Empty Variant State */}

                {variants.length ===
                0 ? (
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-3 py-2.5">
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        No variants added
                      </p>

                      <p className="mt-0.5 text-[10px] text-gray-400">
                        Leave this section
                        empty for a simple
                        product.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
                    <div className="min-w-[660px]">
                      <div className="grid grid-cols-[1fr_1fr_1.7fr_90px_42px] bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        <div>
                          Color
                        </div>

                        <div>
                          Size
                        </div>

                        <div>
                          SKU
                        </div>

                        <div>
                          Stock
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
                            className="grid grid-cols-[1fr_1fr_1.7fr_90px_42px] items-center border-t border-gray-100 px-3 py-2.5"
                          >
                            {/* Color */}

                            <div className="min-w-0 pr-2">
                              {variant.colorName ? (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const selectedColor =
                                      colors.find(
                                        (
                                          color
                                        ) =>
                                          color.id ===
                                          variant.colorId
                                      );

                                    return selectedColor?.hexacode ? (
                                      <span
                                        className="h-3 w-3 shrink-0 rounded-full border border-gray-200"
                                        style={{
                                          backgroundColor:
                                            selectedColor.hexacode,
                                        }}
                                      />
                                    ) : null;
                                  })()}

                                  <span className="truncate text-xs text-gray-700">
                                    {
                                      variant.colorName
                                    }
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300">
                                  —
                                </span>
                              )}
                            </div>

                            {/* Size */}

                            <div className="pr-2">
                              {variant.sizeName ? (
                                <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-700">
                                  {
                                    variant.sizeName
                                  }
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">
                                  —
                                </span>
                              )}
                            </div>

                            {/* SKU */}

                            <div className="pr-2">
                              <input
                                value={
                                  variant.sku
                                }
                                onChange={(
                                  event
                                ) =>
                                  setVariants(
                                    (
                                      current
                                    ) =>
                                      current.map(
                                        (
                                          item
                                        ) =>
                                          item.id ===
                                          variant.id
                                            ? {
                                                ...item,

                                                sku:
                                                  event
                                                    .target
                                                    .value,
                                              }
                                            : item
                                      )
                                  )
                                }
                                className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none transition focus:border-blue-500"
                              />
                            </div>

                            {/* Quantity */}

                            <div className="pr-2">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  variant.quantity
                                }
                                onChange={(
                                  event
                                ) =>
                                  setVariants(
                                    (
                                      current
                                    ) =>
                                      current.map(
                                        (
                                          item
                                        ) =>
                                          item.id ===
                                          variant.id
                                            ? {
                                                ...item,

                                                quantity:
                                                  Number(
                                                    event
                                                      .target
                                                      .value
                                                  ),
                                              }
                                            : item
                                      )
                                  )
                                }
                                className="h-8 w-full rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-900 outline-none transition focus:border-blue-500"
                              />
                            </div>

                            {/* Delete */}

                            <button
                              type="button"
                              onClick={() =>
                                removeVariant(
                                  variant.id
                                )
                              }
                              title="Remove variant"
                              aria-label="Remove variant"
                              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
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
                    event.target.value
                  )
                }
                rows={4}
                placeholder="Write product description..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Product Status */}

            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-xs font-medium text-gray-800">
                  Product Status
                </p>

                <p className="mt-0.5 text-[10px] text-gray-400">
                  Active products can be
                  shown to customers.
                </p>
              </div>

              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={
                    isActive
                  }
                  onChange={(
                    event
                  ) =>
                    setIsActive(
                      event.target.checked
                    )
                  }
                  className="peer sr-only"
                />

                <span className="h-5 w-9 rounded-full bg-gray-200 transition peer-checked:bg-blue-600" />

                <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
              </label>
            </div>

            {/* Save */}

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <div className="w-full sm:w-44">
                <Button
                  type="submit"
                  fullWidth
                  disabled={
                    isSubmitting ||
                    isUploading ||
                    isAddingCategory
                  }
                >
                  {isSubmitting
                    ? isEditMode
                      ? "Updating..."
                      : "Saving..."
                    : isEditMode
                      ? "Update Product"
                      : "Save Product"}
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