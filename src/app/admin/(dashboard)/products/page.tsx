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

    /*
     * Reuse the existing Category
     * table. Admin should be able
     * to filter all store products.
     */
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
    <section>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your store
            products and inventory.
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center justify-center rounded-md bg-[#087ff5] px-5 text-sm font-medium text-white transition hover:bg-[#066ed6]"
        >
          + Add Product
        </Link>
      </div>

      <div className="mb-5">
        <AdminProductFilters
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

      {products.length ===
      0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
          <p className="font-medium text-gray-800">
            No products found
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Try another search
            or category.
          </p>
        </div>
      ) : (
        <>
          <AdminProductsTable
            products={
              products
            }
          />

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {
                pagination.total
              }{" "}
              Total Products
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
        </>
      )}
    </section>
  );
}