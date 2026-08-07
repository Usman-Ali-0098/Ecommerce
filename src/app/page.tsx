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
    params.sort === "name"
      ? "name"
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
  <main className="w-full px-4 py-7 sm:px-6 lg:px-8 xl:px-10">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <h1 className="text-[25px] font-medium text-[#087ff5]">
        Our Products
      </h1>

      <ProductFilters
        categories={categories}
      />
    </div>

    <section className="mt-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {pagination.total} product
          {pagination.total === 1
            ? ""
            : "s"}{" "}
          found
        </p>

        <p className="text-sm text-gray-400">
          Page {pagination.page} of{" "}
          {Math.max(
            pagination.totalPages,
            1
          )}
        </p>
      </div>

      <ProductGrid products={products}/>
      
      <ProductPagination page={pagination.page} totalPages={pagination.totalPages}/>
    </section>
  </main>
</div>
    </>
  );
}