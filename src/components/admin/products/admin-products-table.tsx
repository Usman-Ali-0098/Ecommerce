"use client";

import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

import { useRouter } from "next/navigation";

import Modal from "@/components/ui/modal";
import Alert from "@/components/ui/alert";

import { useAlert } from "@/hooks/use-alert";

import type { AdminProduct } from "@/types/admin-product";

type AdminProductsTableProps = {
  products: AdminProduct[];
};

export default function AdminProductsTable({
  products,
}: AdminProductsTableProps) {
  const router = useRouter();

  const { alert, showAlert, closeAlert } = useAlert();

  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  );

  const [productPendingDelete, setProductPendingDelete] =
    useState<AdminProduct | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  function toggleProduct(productId: string) {
    setExpandedProductId((current) =>
      current === productId ? null : productId,
    );
  }

  function requestDelete(product: AdminProduct) {
    setProductPendingDelete(product);
  }

  function cancelDelete() {
    if (isDeleting) {
      return;
    }

    setProductPendingDelete(null);
  }

  async function confirmDelete() {
    if (!productPendingDelete) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/admin/products/${productPendingDelete.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        showAlert(result.message ?? "Unable to delete product.", {
          variant: "error",
        });

        return;
      }

      setProductPendingDelete(null);

      showAlert(result.message ?? "Product updated successfully.", {
        variant: "success",
      });

      router.refresh();
    } catch (error) {
      console.error("Delete product request error:", error);

      showAlert("Something went wrong while deleting the product.", {
        variant: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-225 border-collapse">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              <th className="w-10 px-3 py-3" />

              <th className="px-3 py-3">Product</th>

              <th className="px-3 py-3">Category</th>

              <th className="px-3 py-3">Price</th>

              <th className="px-3 py-3">Stock</th>

              <th className="px-3 py-3">Status</th>

              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => {
              const isExpanded = expandedProductId === product.id;

              return (
                <ProductRows
                  key={product.id}
                  product={product}
                  isExpanded={isExpanded}
                  onToggle={() => toggleProduct(product.id)}
                  onDelete={() => requestDelete(product)}
                  isDeleting={isDeleting}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={productPendingDelete !== null}
        onClose={cancelDelete}
        title="Delete Product"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-gray-900">
                {productPendingDelete?.name}
              </span>
              ?
            </p>

            <p className="mt-1.5 text-xs leading-5 text-gray-400">
              If this product has previous orders, it will be deactivated
              instead of permanently deleted.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelDelete}
              disabled={isDeleting}
              className="h-9 rounded-lg border border-gray-200 px-3.5 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-9 rounded-lg bg-red-600 px-3.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Product"}
            </button>
          </div>
        </div>
      </Modal>

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

type ProductRowsProps = {
  product: AdminProduct;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
};

function ProductRows({
  product,
  isExpanded,
  onToggle,
  onDelete,
  isDeleting,
}: ProductRowsProps) {
  const hasVariants = product.variants.length > 0;

  return (
    <>
      <tr
        className={`border-b border-gray-100 text-sm text-gray-700 transition ${
          isExpanded ? "bg-blue-50/20" : "hover:bg-gray-50/60"
        }`}
      >
        {/* Expand */}

        <td className="px-3 py-3">
          {hasVariants ? (
            <button
              type="button"
              onClick={onToggle}
              title={isExpanded ? "Hide variants" : "Show variants"}
              aria-label={
                isExpanded
                  ? `Hide variants for ${product.name}`
                  : `Show variants for ${product.name}`
              }
              aria-expanded={isExpanded}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <ChevronIcon open={isExpanded} />
            </button>
          ) : null}
        </td>

        {/* Product */}

        <td className="px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
              {product.image ? (
                <Image
                  src={product.image.url}
                  alt={product.image.altText}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImagePlaceholderIcon />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="max-w-65 truncate text-sm font-medium text-gray-900">
                {product.name}
              </p>

              <p className="mt-0.5 text-[11px] text-gray-400">
                {product.variantCount} variant
                {product.variantCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </td>

        {/* Category */}

        <td className="px-3 py-3 text-xs text-gray-600">
          {product.category.name}
        </td>

        {/* Price */}

        <td className="px-3 py-3">
          <ProductPrice min={product.minPrice} max={product.maxPrice} />
        </td>

        {/* Stock */}

        <td className="px-3 py-3">
          <span
            className={`text-xs font-medium ${
              product.totalStock > 0 ? "text-gray-700" : "text-red-600"
            }`}
          >
            {product.totalStock}
          </span>
        </td>

        {/* Status */}

        <td className="px-3 py-3">
          <ProductStatus active={product.isActive} />
        </td>

        {/* Actions */}

        <td className="px-3 py-3">
          <div className="flex items-center justify-end gap-1">
            <Link
              href={`/admin/products/${product.id}/edit`}
              title="Edit product"
              aria-label={`Edit ${product.name}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <EditIcon />
            </Link>

            <button
              type="button"
              title="Delete product"
              aria-label={`Delete ${product.name}`}
              onClick={onDelete}
              disabled={isDeleting}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon />
            </button>
          </div>
        </td>
      </tr>

      {isExpanded ? (
        <tr className="border-b border-gray-100 bg-gray-50/70">
          <td colSpan={7} className="px-4 py-3">
            <VariantsPanel product={product} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function VariantsPanel({ product }: { product: AdminProduct }) {
  return (
    <div className="ml-8 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <div>
          <p className="text-xs font-semibold text-gray-800">
            Product Variants
          </p>

          <p className="mt-0.5 text-[11px] text-gray-400">
            {product.variantCount} total · {product.activeVariantCount} active
          </p>
        </div>

        <p className="text-[11px] text-gray-400">
          Total stock:{" "}
          <span className="font-medium text-gray-600">
            {product.totalStock}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-180">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/70 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <th className="px-4 py-2.5">Image</th>

              <th className="px-4 py-2.5">SKU</th>

              <th className="px-4 py-2.5">Color</th>

              <th className="px-4 py-2.5">Size</th>

              <th className="px-4 py-2.5">Price</th>

              <th className="px-4 py-2.5">Stock</th>

              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>

          <tbody>
            {product.variants.map((variant) => (
              <tr
                key={variant.id}
                className="border-b border-gray-100 last:border-b-0"
              >
                <td className="px-4 py-2.5">
                  <div className="relative h-9 w-9 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                    {variant.imageUrl ? (
                      <Image
                        src={variant.imageUrl}
                        alt={`${product.name} - ${variant.sku}`}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : product.image ? (
                      <Image
                        src={product.image.url}
                        alt={`${product.name} - base image`}
                        fill
                        sizes="36px"
                        className="object-cover opacity-70"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImagePlaceholderIcon />
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-4 py-2.5">
                  <span className="text-xs font-medium text-gray-700">
                    {variant.sku}
                  </span>
                </td>

                <td className="px-4 py-2.5">
                  {variant.color ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full border border-gray-200"
                        style={{
                          backgroundColor: variant.color.hexacode ?? undefined,
                        }}
                      />

                      <span className="text-xs text-gray-600">
                        {variant.color.name}
                      </span>
                    </div>
                  ) : (
                    <EmptyValue />
                  )}
                </td>

                <td className="px-4 py-2.5">
                  {variant.size ? (
                    <span className="text-xs text-gray-600">
                      {variant.size.name}
                    </span>
                  ) : (
                    <EmptyValue />
                  )}
                </td>

                <td className="px-4 py-2.5">
                  <span className="whitespace-nowrap text-xs font-medium text-gray-700">
                    Rs. {variant.price.toLocaleString("en-PK")}
                  </span>
                </td>

                <td className="px-4 py-2.5">
                  <VariantStock stock={variant.stock} />
                </td>

                <td className="px-4 py-2.5">
                  <VariantStatus active={variant.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductPrice({ min, max }: { min: number; max: number }) {
  if (min === max) {
    return (
      <span className="whitespace-nowrap text-xs font-medium text-gray-800">
        Rs. {min.toLocaleString("en-PK")}
      </span>
    );
  }

  return (
    <span className="whitespace-nowrap text-xs font-medium text-gray-800">
      Rs. {min.toLocaleString("en-PK")}
      {" - "}
      Rs. {max.toLocaleString("en-PK")}
    </span>
  );
}

function ProductStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          active ? "bg-green-500" : "bg-gray-400"
        }`}
      />

      {active ? "Active" : "Inactive"}
    </span>
  );
}

function VariantStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function VariantStock({ stock }: { stock: number }) {
  return (
    <span
      className={`text-xs font-medium ${
        stock > 0 ? "text-gray-700" : "text-red-600"
      }`}
    >
      {stock}
    </span>
  );
}

function EmptyValue() {
  return <span className="text-xs text-gray-300">—</span>;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
      aria-hidden="true"
    >
      <path
        d="M8 6L12 10L8 14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M13.5 6.5L17.5 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M5 19L6 14.5L15.75 4.75C16.44 4.06 17.56 4.06 18.25 4.75L19.25 5.75C19.94 6.44 19.94 7.56 19.25 8.25L9.5 18L5 19Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 7H20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M9 7V5.5C9 4.67 9.67 4 10.5 4H13.5C14.33 4 15 4.67 15 5.5V7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M7 7L8 19C8.07 19.56 8.54 20 9.11 20H14.89C15.46 20 15.93 19.56 16 19L17 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M10 11V16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      <path
        d="M14 11V16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 text-gray-300"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5" />

      <path
        d="M6 17L10 13L13 16L15 14L18 17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
