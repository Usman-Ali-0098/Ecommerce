import { redirect } from "next/navigation";

import { auth } from "@/auth";
import SiteHeader from "@/components/layout/site-header";
import ProductFilters from "@/components/products/product-filters";
import InfiniteProductGrid from "@/components/products/infinite-product-grid";

import { getPublicCategories } from "@/lib/services/category.service";

import {
  getPublicProducts,
  type ProductSort,
} from "@/lib/services/product.service";

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
  }>;
};

const INITIAL_PAGE_SIZE = 12;

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();

  if (session?.user?.role === "ADMIN") {
    redirect("/admin/products");
  }

  // "Wait for Next.js to give me the actual URL query parameters.";
  const params = await searchParams;

  //  * FILTER VALUES

  const category = params.category?.trim() || undefined;

  const search = params.search?.trim() || undefined;

  const sort: ProductSort =
    params.sort === "oldest" ||
    params.sort === "price-low" ||
    params.sort === "price-high"
      ? params.sort
      : "newest";

  /*
   * --------------------------------
   * RESET KEY
   * Whenever category, search, or sort
   * changes, this key changes.
   *
   * React then mounts a fresh
   * InfiniteProductGrid with the new
   * server-fetched products.
   */
  const productsKey = [category ?? "all", search ?? "", sort].join(":");

  // direct extrcting and calling with param

  const [{ products, pagination }, categories] = await Promise.all([
    getPublicProducts({
      category,
      search,
      sort,

      page: 1,

      pageSize: INITIAL_PAGE_SIZE,
    }),

    getPublicCategories(),
  ]);

  return (
    <>
      <SiteHeader />

      <div className="min-h-screen bg-[#f7f9fb]">
        <main className="w-full px-4 py-7 sm:px-6 lg:px-12 xl:px-16">
          {/* --------------------------------
              HEADING + FILTERS
          -------------------------------- */}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="shrink-0 text-[22px] font-semibold tracking-tight text-[#087ff5]">
              Our Products
            </h2>

            <div className="w-full min-w-0 lg:ml-auto lg:w-auto">
              <ProductFilters
                key={`filters:${productsKey}`}
                categories={categories}
              />
            </div>
          </div>

          <hr className="mt-4 border-gray-200" />

          {/* --------------------------------
              PRODUCTS
          -------------------------------- */}

          <section className="mt-6">
            {/* Product count */}

            <div className="mb-5">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">
                  {pagination.total}
                </span>{" "}
                product
                {pagination.total === 1 ? "" : "s"} found
              </p>
            </div>

            {/*
             * Initial products come
             * from the server.
             *
             * key={productsKey} makes
             * the infinite-scroll state
             * reset whenever filters
             * or sorting change.
             */}
            <InfiniteProductGrid
              key={productsKey}
              initialProducts={products}
              initialPage={pagination.page}
              totalPages={pagination.totalPages}
              category={category}
              search={search}
              sort={sort}
            />
          </section>
        </main>
      </div>
    </>
  );
}
