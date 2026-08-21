import Link from "next/link";

import AdminProductFilters from "@/components/admin/products/admin-product-filters";
import AdminProductsPagination from "@/components/admin/products/admin-products-pagination";
import AdminProductsTable from "@/components/admin/products/admin-products-table";

import { getAdminProducts } from "@/lib/services/admin-product.service";
import { prisma } from "@/lib/prisma";

type AdminProductsPageProps = {
  searchParams: Promise<{
    search?: string;
    category?: string;
    page?: string;
  }>;
};

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params =
    await searchParams;

  const search =
    params.search?.trim() ??
    "";

  const category =
    params.category?.trim() ??
    "";

  const parsedPage =
    Number(params.page);

  const page =
    Number.isInteger(
      parsedPage
    ) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const [
    productResult,
    categories,
  ] = await Promise.all([
    getAdminProducts({
      search,
      category,
      page,
      pageSize: 20,
    }),

    prisma.category.findMany({
      orderBy: {
        name: "asc",
      },

      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  const {
    products,
    pagination,
  } = productResult;

  return (
    <section className="space-y-4">
      {/* Page Header */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">
            Products
          </h1>

          <p className="mt-0.5 text-xs text-gray-500">
            Manage products, stock,
            pricing and availability.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex h-9 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <PlusIcon />

          <span className="ml-1.5">
            Add Product
          </span>
        </Link>
      </div>

      {/* Filters */}

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm shadow-gray-100/50">
        <AdminProductFilters
          key={`${search}:${category}`}
          categories={
            categories
          }
          initialSearch={
            search
          }
          initialCategory={
            category
          }
        />
      </div>

      {/* Products */}

      {products.length ===
      0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm shadow-gray-100/50">
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
            <ProductIcon />
          </div>

          <p className="mt-3 text-sm font-medium text-gray-800">
            No products found
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Try changing your
            search or category
            filter.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-100/50">
          <AdminProductsTable
            products={
              products
            }
          />

          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              Showing{" "}
              <span className="font-medium text-gray-700">
                {
                  products.length
                }
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-700">
                {
                  pagination.total
                }
              </span>{" "}
              products
            </p>

            <AdminProductsPagination
              page={
                pagination.page
              }
              totalPages={
                pagination.totalPages
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M10 4V16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M4 10H16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ProductIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 text-gray-500"
      aria-hidden="true"
    >
      <path
        d="M4 7.5L12 3L20 7.5L12 12L4 7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M4 7.5V16.5L12 21L20 16.5V7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M12 12V21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
