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

  const {
    alert,
    showAlert,
    closeAlert,
  } = useAlert();

  const [
    productPendingDelete,
    setProductPendingDelete,
  ] = useState<AdminProduct | null>(null);

  const [
    isDeleting,
    setIsDeleting,
  ] = useState(false);

  function requestDelete(
    product: AdminProduct
  ) {
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
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        showAlert(
          result.message ??
            "Unable to delete product.",
          "error"
        );

        return;
      }

      setProductPendingDelete(null);

      showAlert(
        result.message ??
          "Product updated successfully.",
        "success"
      );

      router.refresh();
    } catch (error) {
      console.error(
        "Delete product request error:",
        error
      );

      showAlert(
        "Something went wrong while deleting the product.",
        "error"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-4 py-3 font-medium">
                Product
              </th>

              <th className="px-4 py-3 font-medium">
                Category
              </th>

              <th className="px-4 py-3 font-medium">
                Price
              </th>

              <th className="px-4 py-3 font-medium">
                Stock
              </th>

              <th className="px-4 py-3 font-medium">
                Status
              </th>

              <th className="px-4 py-3 font-medium">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {products.map((product) => (
              <tr
                key={product.id}
                className="border-b border-gray-100 text-sm text-gray-700 last:border-b-0"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {product.image ? (
                        <Image
                          src={product.image.url}
                          alt={
                            product.image.altText
                          }
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        {product.variantCount}{" "}
                        variant
                        {product.variantCount === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-4">
                  {product.category.name}
                </td>

                <td className="px-4 py-4">
                  <ProductPrice
                    min={product.minPrice}
                    max={product.maxPrice}
                  />
                </td>

                <td className="px-4 py-4">
                  <span
                    className={
                      product.totalStock > 0
                        ? "font-medium text-gray-800"
                        : "font-medium text-red-600"
                    }
                  >
                    {product.totalStock}
                  </span>
                </td>

                <td className="px-4 py-4">
                  <ProductStatus
                    active={product.isActive}
                  />
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-gray-200 px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Edit
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        requestDelete(product)
                      }
                      disabled={isDeleting}
                      className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={productPendingDelete !== null}
        onClose={cancelDelete}
        title="Delete Product"
      >
        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove{" "}
              <span className="font-semibold text-gray-900">
                {productPendingDelete?.name}
              </span>
              ?
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-400">
              If this product has previous
              orders, it will be deactivated
              instead of permanently deleted.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelDelete}
              disabled={isDeleting}
              className="h-9 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="h-9 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDeleting
                ? "Deleting..."
                : "Delete"}
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

function ProductPrice({
  min,
  max,
}: {
  min: number;
  max: number;
}) {
  if (min === max) {
    return (
      <span>
        Rs. {min.toLocaleString("en-PK")}
      </span>
    );
  }

  return (
    <span>
      Rs. {min.toLocaleString("en-PK")}
      {" - "}
      Rs. {max.toLocaleString("en-PK")}
    </span>
  );
}

function ProductStatus({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
        active
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {active
        ? "Active"
        : "Inactive"}
    </span>
  );
}