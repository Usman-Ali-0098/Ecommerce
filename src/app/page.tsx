import SiteHeader from "@/components/layout/site-header";
import ProductFilters from "@/components/products/product-filters";

import { getPublicCategories } from "@/lib/services/category.service";
import { getPublicProducts } from "@/lib/services/product.service";
import ProductGrid from "@/components/products/product-grid";
import ProductPagination from "@/components/products/product-pagination";

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function HomePage({
  searchParams,
}: HomePageProps) {
  const params = await searchParams;

  const category =
    params.category?.trim() || undefined;

  const search =
    params.search?.trim() || undefined;

  const sort =
  params.sort === "oldest" ||
  params.sort === "price-low" ||
  params.sort === "price-high"
    ? params.sort
    : "newest";

  const parsedPage = Number(
    params.page
  );

  const page =
    Number.isInteger(parsedPage) &&
    parsedPage > 0
      ? parsedPage
      : 1;

  const [
    { products, pagination },
    categories,
  ] = await Promise.all([
    getPublicProducts({
      category,
      search,
      sort,
      page,
      pageSize: 24,
    }),

    getPublicCategories(),
  ]);

  return (
    <>
      <SiteHeader />

   <div className="min-h-screen bg-[#f7f9fb]">
  <main className="w-full px-4 py-7 sm:px-6 lg:px-12 xl:px-16">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <h2 className="shrink-0 text-[22px] font-semibold tracking-tight text-[#087ff5]">
        Our Products
      </h2>

      <div className="w-full min-w-0 lg:ml-auto lg:w-auto">
        <ProductFilters
          categories={categories}
        />
      </div>
    </div>
 <hr className="border-gray-200 mt-4" />
    <section className="mt-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">
            {pagination.total}
          </span>{" "}
          product
          {pagination.total === 1
            ? ""
            : "s"}{" "}
          found
        </p>

        <p className="text-xs text-gray-400">
          Page{" "}
          <span className="font-medium text-gray-600">
            {pagination.page}
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-600">
            {Math.max(
              pagination.totalPages,
              1
            )}
          </span>
        </p>
      </div>

      <ProductGrid
        products={products}
      />

      <ProductPagination
        page={pagination.page}
        totalPages={
          pagination.totalPages
        }
      />
    </section>
  </main>
</div>
    </>
  );
}